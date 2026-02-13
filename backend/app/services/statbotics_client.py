import httpx

from app.config import settings


class StatboticsClient:
    def __init__(self):
        self.base_url = settings.STATBOTICS_BASE_URL

    async def _get(self, path: str, params: dict | None = None) -> list | dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base_url}{path}", params=params or {}
            )
            resp.raise_for_status()
            return resp.json()

    async def get_team_events(
        self, event: str, limit: int = 100, offset: int = 0
    ) -> list[dict]:
        return await self._get(
            "/team_events",
            params={"event": event, "limit": limit, "offset": offset},
        )

    async def get_team_event(self, team: int, event: str) -> dict:
        return await self._get(f"/team_event/{team}/{event}")

    async def get_event(self, event_key: str) -> dict:
        return await self._get(f"/event/{event_key}")
