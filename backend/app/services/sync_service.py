from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models import CacheMeta, Event, Team, TeamEvent
from app.services.tba_client import TBAClient
from app.services.statbotics_client import StatboticsClient


class SyncService:
    def __init__(self, db: Session):
        self.db = db
        self.tba = TBAClient()
        self.statbotics = StatboticsClient()
        self.ttl = settings.CACHE_TTL_SECONDS

    def _is_cache_fresh(self, cache_key: str) -> bool:
        meta = self.db.query(CacheMeta).get(cache_key)
        if not meta or not meta.last_fetched:
            return False
        elapsed = (
            datetime.now(timezone.utc) - meta.last_fetched.replace(tzinfo=timezone.utc)
        ).total_seconds()
        return elapsed < (meta.ttl_seconds or self.ttl)

    def invalidate_cache(self, cache_key: str):
        meta = self.db.query(CacheMeta).get(cache_key)
        if meta:
            self.db.delete(meta)
            self.db.commit()

    def _update_cache(self, cache_key: str):
        meta = self.db.query(CacheMeta).get(cache_key)
        if meta:
            meta.last_fetched = datetime.now(timezone.utc)
        else:
            meta = CacheMeta(
                cache_key=cache_key,
                last_fetched=datetime.now(timezone.utc),
                ttl_seconds=self.ttl,
            )
            self.db.add(meta)
        self.db.commit()

    async def get_events(self, year: int) -> list[Event]:
        cache_key = f"events_{year}"
        if self._is_cache_fresh(cache_key):
            return (
                self.db.query(Event)
                .filter(Event.year == year)
                .order_by(Event.start_date)
                .all()
            )

        raw = await self.tba.get_events(year)
        for ev in raw:
            existing = self.db.query(Event).get(ev["key"])
            if existing:
                existing.name = ev.get("name", "")
                existing.event_type = ev.get("event_type")
                existing.city = ev.get("city")
                existing.state_prov = ev.get("state_prov")
                existing.country = ev.get("country")
                existing.start_date = ev.get("start_date")
                existing.end_date = ev.get("end_date")
                existing.week = ev.get("week")
            else:
                self.db.add(
                    Event(
                        key=ev["key"],
                        name=ev.get("name", ""),
                        event_type=ev.get("event_type"),
                        year=year,
                        city=ev.get("city"),
                        state_prov=ev.get("state_prov"),
                        country=ev.get("country"),
                        start_date=ev.get("start_date"),
                        end_date=ev.get("end_date"),
                        week=ev.get("week"),
                    )
                )
        self.db.commit()
        self._update_cache(cache_key)

        return (
            self.db.query(Event)
            .filter(Event.year == year)
            .order_by(Event.start_date)
            .all()
        )

    async def get_teams_for_event(self, event_key: str) -> list[TeamEvent]:
        cache_key = f"team_events_{event_key}"
        if self._is_cache_fresh(cache_key):
            return (
                self.db.query(TeamEvent)
                .filter(TeamEvent.event_key == event_key)
                .order_by(TeamEvent.rank.asc().nullslast())
                .all()
            )

        # Fetch teams from TBA
        tba_teams = await self.tba.get_event_teams(event_key)
        team_map: dict[str, dict] = {}
        for t in tba_teams:
            key = t["key"]
            team_map[key] = t
            existing = self.db.query(Team).get(key)
            if not existing:
                self.db.add(
                    Team(
                        key=key,
                        team_number=t.get("team_number", 0),
                        nickname=t.get("nickname", ""),
                        name=t.get("name", ""),
                        city=t.get("city"),
                        state_prov=t.get("state_prov"),
                        country=t.get("country"),
                        rookie_year=t.get("rookie_year"),
                    )
                )
        self.db.commit()

        # Fetch rankings from TBA
        rank_map: dict[str, dict] = {}
        try:
            rankings_data = await self.tba.get_event_rankings(event_key)
            if rankings_data and rankings_data.get("rankings"):
                for r in rankings_data["rankings"]:
                    rank_map[r["team_key"]] = {
                        "rank": r.get("rank"),
                        "wins": r.get("record", {}).get("wins", 0),
                        "losses": r.get("record", {}).get("losses", 0),
                        "ties": r.get("record", {}).get("ties", 0),
                    }
        except Exception:
            pass

        # Fetch EPA from Statbotics
        epa_map: dict[str, dict] = {}
        try:
            offset = 0
            while True:
                batch = await self.statbotics.get_team_events(
                    event=event_key, limit=100, offset=offset
                )
                if not batch:
                    break
                for te in batch:
                    team_key = f"frc{te.get('team', te.get('team_number', ''))}"
                    epa_data = te.get("epa", {})
                    total_points = epa_data.get("total_points", {})
                    breakdown = epa_data.get("breakdown", {})
                    epa_map[team_key] = {
                        "epa": total_points.get("mean") if isinstance(total_points, dict) else total_points,
                        "auto_epa": breakdown.get("auto_points"),
                        "teleop_epa": breakdown.get("teleop_points"),
                        "endgame_epa": breakdown.get("endgame_points"),
                        "rp_1_epa": breakdown.get("rp_1"),
                        "rp_2_epa": breakdown.get("rp_2"),
                    }
                offset += len(batch)
                if len(batch) < 100:
                    break
        except Exception:
            pass

        # Merge and upsert TeamEvent rows
        for team_key, team_data in team_map.items():
            rank_data = rank_map.get(team_key, {})
            epa_data = epa_map.get(team_key, {})

            existing = (
                self.db.query(TeamEvent)
                .filter(
                    TeamEvent.team_key == team_key,
                    TeamEvent.event_key == event_key,
                )
                .first()
            )

            if existing:
                existing.rank = rank_data.get("rank")
                existing.wins = rank_data.get("wins", 0)
                existing.losses = rank_data.get("losses", 0)
                existing.ties = rank_data.get("ties", 0)
                existing.epa = epa_data.get("epa")
                existing.auto_epa = epa_data.get("auto_epa")
                existing.teleop_epa = epa_data.get("teleop_epa")
                existing.endgame_epa = epa_data.get("endgame_epa")
                existing.rp_1_epa = epa_data.get("rp_1_epa")
                existing.rp_2_epa = epa_data.get("rp_2_epa")
                existing.nickname = team_data.get("nickname", "")
            else:
                self.db.add(
                    TeamEvent(
                        team_key=team_key,
                        event_key=event_key,
                        team_number=team_data.get("team_number", 0),
                        nickname=team_data.get("nickname", ""),
                        rank=rank_data.get("rank"),
                        wins=rank_data.get("wins", 0),
                        losses=rank_data.get("losses", 0),
                        ties=rank_data.get("ties", 0),
                        epa=epa_data.get("epa"),
                        auto_epa=epa_data.get("auto_epa"),
                        teleop_epa=epa_data.get("teleop_epa"),
                        endgame_epa=epa_data.get("endgame_epa"),
                        rp_1_epa=epa_data.get("rp_1_epa"),
                        rp_2_epa=epa_data.get("rp_2_epa"),
                    )
                )

        self.db.commit()
        self._update_cache(cache_key)

        return (
            self.db.query(TeamEvent)
            .filter(TeamEvent.event_key == event_key)
            .order_by(TeamEvent.rank.asc().nullslast())
            .all()
        )
