from pydantic import BaseModel


class EventResponse(BaseModel):
    key: str
    name: str
    event_type: int | None = None
    year: int
    city: str | None = None
    state_prov: str | None = None
    country: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    week: int | None = None

    model_config = {"from_attributes": True}
