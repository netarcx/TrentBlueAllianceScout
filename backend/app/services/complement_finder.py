from app.models.team_event import TeamEvent
from app.schemas.prediction import ComplementCandidate, ComplementResponse
from app.schemas.team import TeamEventResponse
from app.services.alliance_optimizer import compute_synergy, score_team


class ComplementFinder:
    def find_complements(
        self,
        target: TeamEvent,
        available: list[TeamEvent],
        top_n: int = 10,
    ) -> ComplementResponse:
        target_score = score_team(target)
        components = {
            "auto": target_score.auto_epa,
            "teleop": target_score.teleop_epa,
            "endgame": target_score.endgame_epa,
        }
        total = sum(components.values()) or 1.0
        normalized = {k: v / total for k, v in components.items()}
        weaknesses = [k for k, v in normalized.items() if v < 0.25]

        candidates: list[ComplementCandidate] = []

        for te in available:
            if te.team_key == target.team_key:
                continue

            c = score_team(te)
            combined_epa = target_score.epa + c.epa
            synergy = compute_synergy([target_score, c])

            coverage = []
            comp_map = {
                "auto": c.auto_epa,
                "teleop": c.teleop_epa,
                "endgame": c.endgame_epa,
            }
            for w in weaknesses:
                if comp_map.get(w, 0) > target_score.epa * 0.3:
                    coverage.append(w)

            c_total = c.auto_epa + c.teleop_epa + c.endgame_epa or 1.0
            c_normalized = {
                "auto": c.auto_epa / c_total if c_total else 0,
                "teleop": c.teleop_epa / c_total if c_total else 0,
                "endgame": c.endgame_epa / c_total if c_total else 0,
            }
            strength_areas = [k for k, v in c_normalized.items() if v >= 0.35]

            coverage_bonus = len(coverage) * 2.0
            fit_score = combined_epa + synergy * 3.0 + coverage_bonus

            candidates.append(
                ComplementCandidate(
                    team=TeamEventResponse.model_validate(te),
                    combined_epa=round(combined_epa, 2),
                    synergy_score=round(synergy, 2),
                    strength_areas=strength_areas,
                    weakness_coverage=coverage,
                    overall_fit_score=round(fit_score, 2),
                )
            )

        candidates.sort(key=lambda c: c.overall_fit_score, reverse=True)
        return ComplementResponse(
            target_team=TeamEventResponse.model_validate(target),
            complements=candidates[:top_n],
        )
