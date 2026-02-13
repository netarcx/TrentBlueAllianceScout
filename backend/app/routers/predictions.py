from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.team_event import TeamEvent
from app.schemas.prediction import (
    OptimalAlliancesRequest,
    OptimalAlliancesResponse,
)
from app.services.alliance_optimizer import AllianceOptimizer

router = APIRouter()


@router.post("/predict/optimal-alliances", response_model=OptimalAlliancesResponse)
async def predict_alliances(
    req: OptimalAlliancesRequest, db: Session = Depends(get_db)
):
    team_events = (
        db.query(TeamEvent)
        .filter(TeamEvent.event_key == req.event_key)
        .all()
    )

    optimizer = AllianceOptimizer(req.weights)
    alliances = optimizer.compute_optimal_alliances(team_events)

    return OptimalAlliancesResponse(
        event_key=req.event_key, alliances=alliances
    )
