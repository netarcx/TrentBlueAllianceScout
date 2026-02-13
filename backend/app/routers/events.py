from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.event import EventResponse
from app.schemas.team import TeamEventResponse
from app.services.sync_service import SyncService

router = APIRouter()


@router.get("/events", response_model=list[EventResponse])
async def list_events(year: int, db: Session = Depends(get_db)):
    svc = SyncService(db)
    events = await svc.get_events(year)
    return events


@router.get("/events/{event_key}/teams", response_model=list[TeamEventResponse])
async def list_teams(
    event_key: str, refresh: bool = False, db: Session = Depends(get_db)
):
    svc = SyncService(db)
    if refresh:
        svc.invalidate_cache(f"team_events_{event_key}")
    teams = await svc.get_teams_for_event(event_key)
    return teams
