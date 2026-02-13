from pydantic import BaseModel


class TeamEventResponse(BaseModel):
    team_key: str
    event_key: str
    team_number: int
    nickname: str | None = None
    rank: int | None = None
    wins: int = 0
    losses: int = 0
    ties: int = 0
    epa: float | None = None
    auto_epa: float | None = None
    teleop_epa: float | None = None
    endgame_epa: float | None = None
    rp_1_epa: float | None = None
    rp_2_epa: float | None = None

    model_config = {"from_attributes": True}
