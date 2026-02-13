import httpx

from app.config import settings


class TBAClient:
    def __init__(self):
        self.base_url = settings.TBA_BASE_URL
        self.headers = {"X-TBA-Auth-Key": settings.TBA_API_KEY}

    async def _get(self, path: str) -> list | dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base_url}{path}", headers=self.headers
            )
            resp.raise_for_status()
            return resp.json()

    async def get_events(self, year: int) -> list[dict]:
        return await self._get(f"/events/{year}")

    async def get_event(self, event_key: str) -> dict:
        return await self._get(f"/event/{event_key}")

    async def get_event_teams(self, event_key: str) -> list[dict]:
        return await self._get(f"/event/{event_key}/teams")

    async def get_event_rankings(self, event_key: str) -> dict:
        return await self._get(f"/event/{event_key}/rankings")

    async def get_event_alliances(self, event_key: str) -> list[dict]:
        return await self._get(f"/event/{event_key}/alliances")

    async def get_event_matches(self, event_key: str) -> list[dict]:
        return await self._get(f"/event/{event_key}/matches")

    async def get_team_matches_year(self, team_key: str, year: int) -> list[dict]:
        return await self._get(f"/team/{team_key}/matches/{year}")
