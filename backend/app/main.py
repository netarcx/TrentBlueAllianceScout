from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine
from app.models import CacheMeta, TeamEvent
from app.routers import complement, draft, events, matches, predictions


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # One-time: clear stale team_events cache so EPA data re-fetches
    db = SessionLocal()
    try:
        stale = (
            db.query(CacheMeta)
            .filter(CacheMeta.cache_key.like("team_events_%"))
            .all()
        )
        if stale:
            for entry in stale:
                db.delete(entry)
            # Also clear the team_event rows so they get re-populated
            db.query(TeamEvent).delete()
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="FRC Alliance Scout", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
app.include_router(draft.router, prefix="/api")
app.include_router(complement.router, prefix="/api")
app.include_router(matches.router, prefix="/api")
