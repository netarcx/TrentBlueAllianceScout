import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.tba_client import TBAClient

router = APIRouter()


class MatchVideoResponse(BaseModel):
    match_key: str
    event_key: str
    comp_level: str
    match_number: int
    alliance_color: str
    alliance_score: int
    opponent_score: int
    youtube_key: str
    youtube_url: str


def _extract_match_info(match: dict, team_key: str) -> dict | None:
    """Extract score and video info for a team's match."""
    videos = match.get("videos", [])
    youtube_videos = [v for v in (videos or []) if v.get("type") == "youtube"]
    if not youtube_videos:
        return None

    # Determine which alliance the team is on
    alliances = match.get("alliances", {})
    color = None
    for c in ["red", "blue"]:
        if team_key in alliances.get(c, {}).get("team_keys", []):
            color = c
            break
    if not color:
        return None

    score = alliances[color].get("score", 0)
    opponent_color = "blue" if color == "red" else "red"
    opponent_score = alliances[opponent_color].get("score", 0)

    if score is None or score < 0:
        return None

    yt = youtube_videos[0]
    return {
        "match_key": match["key"],
        "event_key": match.get("event_key", ""),
        "comp_level": match.get("comp_level", ""),
        "match_number": match.get("match_number", 0),
        "alliance_color": color,
        "alliance_score": score,
        "opponent_score": opponent_score,
        "youtube_key": yt["key"],
        "youtube_url": f"https://www.youtube.com/watch?v={yt['key']}",
    }


@router.get(
    "/team/{team_key}/match-video/{year}/{kind}",
    response_model=MatchVideoResponse,
)
async def get_match_video(team_key: str, year: int, kind: str):
    """Get a match video for a team. kind = 'best', 'worst', or 'random'."""
    if kind not in ("best", "worst", "random"):
        raise HTTPException(400, "kind must be 'best', 'worst', or 'random'")

    tba = TBAClient()
    matches = await tba.get_team_matches_year(team_key, year)

    scored_matches = []
    for m in matches:
        info = _extract_match_info(m, team_key)
        if info:
            scored_matches.append(info)

    if not scored_matches:
        raise HTTPException(404, "No matches with video found for this team")

    if kind == "best":
        result = max(scored_matches, key=lambda m: m["alliance_score"])
    elif kind == "worst":
        result = min(scored_matches, key=lambda m: m["alliance_score"])
    else:
        result = random.choice(scored_matches)

    return MatchVideoResponse(**result)
