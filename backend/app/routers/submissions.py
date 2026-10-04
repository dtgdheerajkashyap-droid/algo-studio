"""Submissions router — POST /submissions runs code locally and persists results.

Response matches frontend PracticeTab SubmissionResult:
  {status: 'accepted'|'wrong-answer'|'error', results: TestResult[], ai_feedback: string|null}
"""

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .. import ai
from ..algorithms import ALGORITHMS
from ..db import get_db
from ..models import Submission, User
from ..rate_limit import client_ip, limiter
from ..runner import RunnerBusy, RunReport, ToolchainMissing, run_submission
from ..security import get_current_user

router = APIRouter(tags=["submissions"])

MAX_CODE_CHARS = 50_000


class SubmissionBody(BaseModel):
    algorithm_id: str
    language: str
    code: str = Field(max_length=MAX_CODE_CHARS)


@router.post("/submissions")
async def create_submission(
    body: SubmissionBody,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Dual-key rate limit: per-user AND per-IP. The per-IP cap catches
    # multi-account abuse while the per-user cap prevents a single active
    # user from eating all the runner CPU.
    ip = client_ip(request)
    if not limiter.try_consume("submit.perUser", str(user.id)):
        raise HTTPException(
            status_code=429,
            detail="Too many submissions in the last minute — slow down and try again shortly.",
        )
    if not limiter.try_consume("submit.perIP", ip):
        raise HTTPException(
            status_code=429,
            detail="Too many submissions from this IP address — please wait a minute.",
        )

    algo = ALGORITHMS.get(body.algorithm_id)
    if not algo:
        raise HTTPException(status_code=404, detail=f"Unknown algorithm: {body.algorithm_id}")
    if body.language not in ("cpp", "java", "python"):
        raise HTTPException(status_code=422, detail=f"Unsupported language: {body.language}")
    if not body.code.strip():
        raise HTTPException(status_code=422, detail="Code is empty")

    try:
        # subprocess work off the event loop so concurrent requests aren't blocked
        report: RunReport = await asyncio.to_thread(
            run_submission, body.language, body.code, algo.tests
        )
    except ToolchainMissing as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RunnerBusy:
        raise HTTPException(
            status_code=503,
            detail="The code runner is busy right now — please try again in a few seconds.",
        )

    # Compile errors: surface the message as a single failed "compile" entry.
    results = [r.to_dict() for r in report.results]
    if report.error_message and not results:
        results = [
            {
                "label": "compile",
                "passed": False,
                "hidden": False,
                "output": report.error_message,
                "expected": "",
            }
        ]

    failed_labels = [
        r["label"] or f"test {i + 1}"
        for i, r in enumerate(results)
        if not r["passed"] and not r["hidden"]
    ]

    # ---- Persist first (short transaction), then ask the LLM ----
    # SQLite writers serialize; keeping the AI call out of the tx avoids
    # holding the write lock for 5–15s while the provider streams.
    sub = Submission(
        user_id=user.id,
        algorithm_id=algo.id,
        language=body.language,
        code=body.code,
        status=report.status,
        results_json=json.dumps(results),
        ai_feedback=None,
    )
    try:
        db.add(sub)
        db.commit()
        db.refresh(sub)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save submission — please try again.",
        )

    ai_feedback = await ai.submission_feedback(
        algo.name, algo.statement, body.language, body.code, report.status, failed_labels
    )

    # Feedback is non-critical; a failure here must not lose the submission.
    if ai_feedback is not None and ai_feedback != sub.ai_feedback:
        try:
            sub.ai_feedback = ai_feedback
            db.add(sub)
            db.commit()
        except SQLAlchemyError:
            db.rollback()  # submission is fine; feedback stays None

    return {"status": report.status, "results": results, "ai_feedback": ai_feedback}
