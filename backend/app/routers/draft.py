from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.team_event import TeamEvent
from app.schemas.prediction import (
    DraftAutoPickRequest,
    DraftPickRequest,
    DraftStartRequest,
    DraftStateResponse,
)
from app.services.draft_simulator import create_session, get_session

router = APIRouter()


@router.post("/draft/start", response_model=DraftStateResponse)
async def start_draft(req: DraftStartRequest, db: Session = Depends(get_db)):
    team_events = (
        db.query(TeamEvent)
        .filter(TeamEvent.event_key == req.event_key)
        .all()
    )
    if len(team_events) < 8:
        raise HTTPException(400, "Not enough teams for a draft")

    session = create_session(req.event_key, team_events, req.num_rounds)
    return session.to_response()


@router.post("/draft/pick", response_model=DraftStateResponse)
async def make_pick(req: DraftPickRequest):
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(404, "Draft session not found")
    try:
        session.make_pick(req.team_key)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return session.to_response()


@router.post("/draft/auto-pick", response_model=DraftStateResponse)
async def auto_pick(req: DraftAutoPickRequest):
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(404, "Draft session not found")
    try:
        session.auto_pick()
    except ValueError as e:
        raise HTTPException(400, str(e))
    return session.to_response()


@router.post("/draft/auto-complete", response_model=DraftStateResponse)
async def auto_complete(req: DraftAutoPickRequest):
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(404, "Draft session not found")
    try:
        while not session.phase.value == "complete":
            session.auto_pick()
    except ValueError as e:
        raise HTTPException(400, str(e))
    return session.to_response()


@router.get("/draft/{session_id}", response_model=DraftStateResponse)
async def get_draft_state(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Draft session not found")
    return session.to_response()
