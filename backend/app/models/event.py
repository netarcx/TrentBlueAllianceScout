from sqlalchemy import Column, Integer, String

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    key = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    event_type = Column(Integer)
    year = Column(Integer, index=True)
    city = Column(String, nullable=True)
    state_prov = Column(String, nullable=True)
    country = Column(String, nullable=True)
    start_date = Column(String)
    end_date = Column(String)
    week = Column(Integer, nullable=True)
