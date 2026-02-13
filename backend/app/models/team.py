from sqlalchemy import Column, Integer, String

from app.database import Base


class Team(Base):
    __tablename__ = "teams"

    key = Column(String, primary_key=True)
    team_number = Column(Integer, index=True)
    nickname = Column(String)
    name = Column(String)
    city = Column(String, nullable=True)
    state_prov = Column(String, nullable=True)
    country = Column(String, nullable=True)
    rookie_year = Column(Integer, nullable=True)
