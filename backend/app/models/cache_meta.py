from sqlalchemy import Column, DateTime, Integer, String

from app.database import Base


class CacheMeta(Base):
    __tablename__ = "cache_meta"

    cache_key = Column(String, primary_key=True)
    last_fetched = Column(DateTime)
    ttl_seconds = Column(Integer, default=3600)
