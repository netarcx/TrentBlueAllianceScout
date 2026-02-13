from pydantic import BaseModel

from app.schemas.team import TeamEventResponse


class AllianceWeights(BaseModel):
    auto: float = 1.0
    teleop: float = 1.0
    endgame: float = 1.0
    consistency: float = 0.5
    synergy: float = 0.3


class OptimalAlliancesRequest(BaseModel):
    event_key: str
    weights: AllianceWeights | None = None


class PredictedAlliance(BaseModel):
    rank: int
    teams: list[TeamEventResponse]
    combined_epa: float
    auto_epa_sum: float
    teleop_epa_sum: float
    endgame_epa_sum: float
    synergy_score: float
    total_score: float


class OptimalAlliancesResponse(BaseModel):
    event_key: str
    alliances: list[PredictedAlliance]


class DraftStartRequest(BaseModel):
    event_key: str
    num_rounds: int = 2


class DraftPickRequest(BaseModel):
    session_id: str
    team_key: str


class DraftAutoPickRequest(BaseModel):
    session_id: str


class DraftPick(BaseModel):
    round: int
    alliance_number: int
    team: TeamEventResponse


class DraftStateResponse(BaseModel):
    session_id: str
    event_key: str
    round: int
    current_alliance: int
    pick_direction: str
    alliances: dict[str, list[TeamEventResponse]]
    available_teams: list[TeamEventResponse]
    pick_history: list[DraftPick]
    is_complete: bool


class ComplementCandidate(BaseModel):
    team: TeamEventResponse
    combined_epa: float
    synergy_score: float
    strength_areas: list[str]
    weakness_coverage: list[str]
    overall_fit_score: float


class ComplementResponse(BaseModel):
    target_team: TeamEventResponse
    complements: list[ComplementCandidate]
