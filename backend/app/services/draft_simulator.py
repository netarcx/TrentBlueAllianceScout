import uuid
from enum import Enum

from app.models.team_event import TeamEvent
from app.schemas.prediction import DraftPick, DraftStateResponse
from app.schemas.team import TeamEventResponse
from app.services.alliance_optimizer import AllianceOptimizer, AllianceWeights, score_team


class DraftPhase(Enum):
    ROUND_1_FORWARD = "round_1_forward"
    ROUND_2_REVERSE = "round_2_reverse"
    ROUND_3_FORWARD = "round_3_forward"
    COMPLETE = "complete"


class DraftSession:
    def __init__(
        self, event_key: str, team_events: list[TeamEvent], num_rounds: int = 2
    ):
        self.session_id = str(uuid.uuid4())
        self.event_key = event_key
        self.num_rounds = num_rounds

        sorted_teams = sorted(
            team_events,
            key=lambda te: (te.rank if te.rank else 999, -(te.epa or 0)),
        )

        num_alliances = min(8, len(sorted_teams))
        self.alliances: dict[int, list[TeamEvent]] = {
            i: [sorted_teams[i - 1]] for i in range(1, num_alliances + 1)
        }
        self.available = sorted_teams[num_alliances:]
        self.phase = DraftPhase.ROUND_1_FORWARD
        self.current_idx = 0
        self.pick_order = list(range(1, num_alliances + 1))
        self.pick_history: list[dict] = []

    @property
    def current_picking_alliance(self) -> int:
        if self.phase == DraftPhase.COMPLETE or self.current_idx >= len(self.pick_order):
            return 0
        return self.pick_order[self.current_idx]

    @property
    def current_round(self) -> int:
        if self.phase == DraftPhase.ROUND_1_FORWARD:
            return 1
        elif self.phase == DraftPhase.ROUND_2_REVERSE:
            return 2
        elif self.phase == DraftPhase.ROUND_3_FORWARD:
            return 3
        return 0

    def make_pick(self, team_key: str) -> "DraftSession":
        if self.phase == DraftPhase.COMPLETE:
            raise ValueError("Draft is complete")

        picked = next(
            (t for t in self.available if t.team_key == team_key), None
        )
        if not picked:
            raise ValueError(f"Team {team_key} is not available")

        alliance_num = self.current_picking_alliance
        self.alliances[alliance_num].append(picked)
        self.available = [t for t in self.available if t.team_key != team_key]

        self.pick_history.append(
            {
                "round": self.current_round,
                "alliance_number": alliance_num,
                "team_key": team_key,
            }
        )

        self._advance()
        return self

    def auto_pick(self) -> "DraftSession":
        if self.phase == DraftPhase.COMPLETE:
            raise ValueError("Draft is complete")

        alliance_num = self.current_picking_alliance
        current_members = self.alliances[alliance_num]
        optimizer = AllianceOptimizer(AllianceWeights())

        best_team = None
        best_score = -float("inf")

        captain_score = score_team(current_members[0])

        if len(current_members) == 1:
            # Round 1: picking 1st partner. Look ahead - for each candidate,
            # find the best possible 3rd pick from remaining pool and score
            # the full 3-team alliance.
            for candidate in self.available:
                cand_score = score_team(candidate)
                remaining = [
                    t for t in self.available if t.team_key != candidate.team_key
                ]
                # Find the best 3rd team to pair with this candidate
                best_third_score = -float("inf")
                for third in remaining:
                    trio = [captain_score, cand_score, score_team(third)]
                    s = optimizer.score_alliance(trio)
                    if s > best_third_score:
                        best_third_score = s
                if best_third_score > best_score:
                    best_score = best_third_score
                    best_team = candidate
        else:
            # Round 2+: picking to complete the alliance. Score the full
            # alliance with synergy, complement coverage, etc.
            current_scores = [score_team(t) for t in current_members]
            for candidate in self.available:
                trial = current_scores + [score_team(candidate)]
                s = optimizer.score_alliance(trial)
                if s > best_score:
                    best_score = s
                    best_team = candidate

        if best_team:
            return self.make_pick(best_team.team_key)
        raise ValueError("No available teams")

    def _advance(self):
        self.current_idx += 1
        if self.current_idx >= len(self.pick_order):
            self.current_idx = 0
            num = len(self.alliances)
            if self.phase == DraftPhase.ROUND_1_FORWARD:
                self.phase = DraftPhase.ROUND_2_REVERSE
                self.pick_order = list(range(num, 0, -1))
            elif self.phase == DraftPhase.ROUND_2_REVERSE:
                if self.num_rounds >= 3:
                    self.phase = DraftPhase.ROUND_3_FORWARD
                    self.pick_order = list(range(1, num + 1))
                else:
                    self.phase = DraftPhase.COMPLETE
            elif self.phase == DraftPhase.ROUND_3_FORWARD:
                self.phase = DraftPhase.COMPLETE

    def to_response(self) -> DraftStateResponse:
        def te_to_resp(te: TeamEvent) -> TeamEventResponse:
            return TeamEventResponse.model_validate(te)

        alliances_resp = {
            str(k): [te_to_resp(t) for t in v]
            for k, v in self.alliances.items()
        }

        history = [
            DraftPick(
                round=p["round"],
                alliance_number=p["alliance_number"],
                team=te_to_resp(
                    next(
                        t
                        for alliance in self.alliances.values()
                        for t in alliance
                        if t.team_key == p["team_key"]
                    )
                ),
            )
            for p in self.pick_history
        ]

        direction = "forward"
        if self.phase == DraftPhase.ROUND_2_REVERSE:
            direction = "reverse"

        return DraftStateResponse(
            session_id=self.session_id,
            event_key=self.event_key,
            round=self.current_round,
            current_alliance=self.current_picking_alliance,
            pick_direction=direction,
            alliances=alliances_resp,
            available_teams=[te_to_resp(t) for t in self.available],
            pick_history=history,
            is_complete=self.phase == DraftPhase.COMPLETE,
        )


# In-memory session store
_sessions: dict[str, DraftSession] = {}


def create_session(
    event_key: str, team_events: list[TeamEvent], num_rounds: int = 2
) -> DraftSession:
    session = DraftSession(event_key, team_events, num_rounds)
    _sessions[session.session_id] = session
    return session


def get_session(session_id: str) -> DraftSession | None:
    return _sessions.get(session_id)
