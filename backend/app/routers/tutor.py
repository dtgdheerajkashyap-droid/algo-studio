"""Tutor router — POST /tutor/chat streams a plain-text reply.

Frontend (TutorTab) reads the raw response body chunk by chunk via streamPost;
history excludes the current question.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .. import ai
from ..algorithms import ALGORITHMS
from ..models import User
from ..rate_limit import limiter
from ..security import get_current_user

router = APIRouter(prefix="/tutor", tags=["tutor"])

MAX_HISTORY = 30


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatBody(BaseModel):
    algorithm_id: str
    question: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = []
    step: int = 0
    context: list[dict] = []


@router.post("/chat")
async def chat(
    body: ChatBody,
    request: Request,
    user: User = Depends(get_current_user),
):
    if not limiter.try_consume("tutor.perUser", str(user.id)):
        raise HTTPException(
            status_code=429,
            detail="Too many tutor messages — wait a moment and try again.",
        )
    algo = ALGORITHMS.get(body.algorithm_id)
    if not algo:
        raise HTTPException(status_code=404, detail=f"Unknown algorithm: {body.algorithm_id}")

    history = [m.model_dump() for m in body.history[-MAX_HISTORY:]]
    stream = ai.stream_tutor_reply(
        algorithm_name=algo.name,
        statement=algo.statement,
        question=body.question,
        history=history,
        step=body.step,
        context=body.context[-20:],
    )
    return StreamingResponse(stream, media_type="text/plain; charset=utf-8")
