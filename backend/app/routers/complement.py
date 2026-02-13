from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.team_event import TeamEvent
from app.schemas.prediction import ComplementResponse
from app.services.complement_finder import ComplementFinder

router = APIRouter()


@router.get(
    "/complement/{event_key}/{team_key}", response_model=ComplementResponse
)
async def find_complements(
    event_key: str, team_key: str, db: Session = Depends(get_db)
):
    team_events = (
        db.query(TeamEvent)
        .filter(TeamEvent.event_key == event_key)
        .all()
    )

    target = next(
        (te for te in team_events if te.team_key == team_key), None
    )
    if not target:
        raise HTTPException(404, f"Team {team_key} not found at event {event_key}")

    finder = ComplementFinder()
    return finder.find_complements(target, team_events)
