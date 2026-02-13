from sqlalchemy import Column, Float, Integer, String, UniqueConstraint

from app.database import Base


class TeamEvent(Base):
    __tablename__ = "team_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_key = Column(String, index=True)
    event_key = Column(String, index=True)
    team_number = Column(Integer)

    # Ranking data (from TBA)
    rank = Column(Integer, nullable=True)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    ties = Column(Integer, default=0)

    # EPA data (from Statbotics)
    epa = Column(Float, nullable=True)
    auto_epa = Column(Float, nullable=True)
    teleop_epa = Column(Float, nullable=True)
    endgame_epa = Column(Float, nullable=True)
    rp_1_epa = Column(Float, nullable=True)
    rp_2_epa = Column(Float, nullable=True)

    # Team info (denormalized for convenience)
    nickname = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("team_key", "event_key", name="uq_team_event"),
    )
