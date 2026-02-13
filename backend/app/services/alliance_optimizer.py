import random
from dataclasses import dataclass

from app.models.team_event import TeamEvent
from app.schemas.prediction import AllianceWeights, PredictedAlliance
from app.schemas.team import TeamEventResponse


@dataclass
class TeamScore:
    team_key: str
    team_number: int
    nickname: str
    epa: float
    auto_epa: float
    teleop_epa: float
    endgame_epa: float
    consistency: float
    rp_potential: float
    _source: TeamEvent | None = None


def score_team(te: TeamEvent) -> TeamScore:
    epa = te.epa or 0.0
    return TeamScore(
        team_key=te.team_key,
        team_number=te.team_number,
        nickname=te.nickname or "",
        epa=epa,
        auto_epa=te.auto_epa or 0.0,
        teleop_epa=te.teleop_epa or 0.0,
        endgame_epa=te.endgame_epa or 0.0,
        consistency=1.0,
        rp_potential=(te.rp_1_epa or 0.0) + (te.rp_2_epa or 0.0),
        _source=te,
    )


def compute_synergy(teams: list[TeamScore]) -> float:
    components = ["auto_epa", "teleop_epa", "endgame_epa"]
    synergy = 0.0

    for comp in components:
        values = [getattr(t, comp) for t in teams]
        if max(values) > 0:
            synergy += 1.0

    leaders = []
    for t in teams:
        best_comp = max(
            [("auto", t.auto_epa), ("teleop", t.teleop_epa), ("endgame", t.endgame_epa)],
            key=lambda x: x[1],
        )
        leaders.append(best_comp[0])

    unique_leaders = len(set(leaders))
    synergy += unique_leaders * 0.5
    return synergy


def _team_to_response(ts: TeamScore) -> TeamEventResponse:
    te = ts._source
    if te:
        return TeamEventResponse.model_validate(te)
    return TeamEventResponse(
        team_key=ts.team_key,
        event_key="",
        team_number=ts.team_number,
        nickname=ts.nickname,
        epa=ts.epa,
        auto_epa=ts.auto_epa,
        teleop_epa=ts.teleop_epa,
        endgame_epa=ts.endgame_epa,
    )


class AllianceOptimizer:
    def __init__(self, weights: AllianceWeights | None = None):
        self.w = weights or AllianceWeights()

    def score_alliance(self, teams: list[TeamScore]) -> float:
        auto_sum = sum(t.auto_epa for t in teams)
        teleop_sum = sum(t.teleop_epa for t in teams)
        endgame_sum = sum(t.endgame_epa for t in teams)
        combined_epa = sum(t.epa for t in teams)
        avg_consistency = sum(t.consistency for t in teams) / max(len(teams), 1)
        synergy = compute_synergy(teams)

        return (
            self.w.auto * auto_sum
            + self.w.teleop * teleop_sum
            + self.w.endgame * endgame_sum
            + self.w.consistency * avg_consistency * combined_epa
            + self.w.synergy * synergy * combined_epa
        )

    def compute_optimal_alliances(
        self, team_events: list[TeamEvent]
    ) -> list[PredictedAlliance]:
        scores = [
            score_team(te) for te in team_events if te.epa is not None and te.epa > 0
        ]
        scores.sort(key=lambda t: t.epa, reverse=True)

        if len(scores) < 6:
            return []

        num_alliances = min(8, len(scores) // 3)
        captains = scores[:num_alliances]
        pool = scores[num_alliances:]

        alliances_td = self._greedy_assign(captains, list(pool))
        alliances_bu = self._greedy_assign(list(reversed(captains)), list(pool))

        best = max(
            [alliances_td, alliances_bu], key=self._total_score
        )
        best = self._local_search(best)

        ranked = sorted(best, key=lambda a: self.score_alliance(a), reverse=True)
        return [self._to_response(i + 1, a) for i, a in enumerate(ranked)]

    def _greedy_assign(
        self, captains: list[TeamScore], pool: list[TeamScore]
    ) -> list[list[TeamScore]]:
        alliances = []
        remaining = list(pool)

        for captain in captains:
            best_pair: tuple[int, int] | None = None
            best_score = -float("inf")

            for i in range(len(remaining)):
                for j in range(i + 1, len(remaining)):
                    trio = [captain, remaining[i], remaining[j]]
                    s = self.score_alliance(trio)
                    if s > best_score:
                        best_score = s
                        best_pair = (i, j)

            if best_pair is not None:
                p1 = remaining[best_pair[0]]
                p2 = remaining[best_pair[1]]
                alliances.append([captain, p1, p2])
                used = {p1.team_key, p2.team_key}
                remaining = [t for t in remaining if t.team_key not in used]
            else:
                alliances.append([captain])

        return alliances

    def _local_search(
        self, alliances: list[list[TeamScore]], max_iterations: int = 500
    ) -> list[list[TeamScore]]:
        best_total = self._total_score(alliances)
        no_improvement = 0

        for _ in range(max_iterations):
            if len(alliances) < 2:
                break

            a1_idx, a2_idx = random.sample(range(len(alliances)), 2)
            if len(alliances[a1_idx]) < 2 or len(alliances[a2_idx]) < 2:
                continue

            pos1 = random.randint(1, len(alliances[a1_idx]) - 1)
            pos2 = random.randint(1, len(alliances[a2_idx]) - 1)

            alliances[a1_idx][pos1], alliances[a2_idx][pos2] = (
                alliances[a2_idx][pos2],
                alliances[a1_idx][pos1],
            )

            new_total = self._total_score(alliances)
            if new_total > best_total:
                best_total = new_total
                no_improvement = 0
            else:
                alliances[a1_idx][pos1], alliances[a2_idx][pos2] = (
                    alliances[a2_idx][pos2],
                    alliances[a1_idx][pos1],
                )
                no_improvement += 1

            if no_improvement > 100:
                break

        return alliances

    def _total_score(self, alliances: list[list[TeamScore]]) -> float:
        return sum(self.score_alliance(a) for a in alliances)

    def _to_response(self, rank: int, teams: list[TeamScore]) -> PredictedAlliance:
        return PredictedAlliance(
            rank=rank,
            teams=[_team_to_response(t) for t in teams],
            combined_epa=sum(t.epa for t in teams),
            auto_epa_sum=sum(t.auto_epa for t in teams),
            teleop_epa_sum=sum(t.teleop_epa for t in teams),
            endgame_epa_sum=sum(t.endgame_epa for t in teams),
            synergy_score=compute_synergy(teams),
            total_score=self.score_alliance(teams),
        )
