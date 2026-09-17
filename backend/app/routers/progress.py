"""Progress router — GET /progress matches DashboardPage's Progress interface."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Submission, User
from ..security import get_current_user

router = APIRouter(tags=["progress"])

RECENT_LIMIT = 25


@router.get("/progress")
def get_progress(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    solved_rows = (
        db.query(Submission.algorithm_id)
        .filter(Submission.user_id == user.id, Submission.status == "accepted")
        .distinct()
        .all()
    )
    recent = (
        db.query(Submission)
        .filter(Submission.user_id == user.id)
        .order_by(Submission.created_at.desc(), Submission.id.desc())
        .limit(RECENT_LIMIT)
        .all()
    )
    return {
        "solved_algorithm_ids": [r[0] for r in solved_rows],
        "submissions": [
            {
                "id": s.id,
                "algorithm_id": s.algorithm_id,
                "language": s.language,
                "status": s.status,
                "created_at": s.created_at.isoformat(),
            }
            for s in recent
        ],
    }
