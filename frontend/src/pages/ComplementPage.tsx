import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchComplements } from "../api/predictions";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import type { ComplementCandidate } from "../types";

function epa(val: number | null): string {
  return val !== null && val !== undefined ? val.toFixed(1) : "-";
}

export default function ComplementPage() {
  const { eventKey, teamKey } = useParams<{
    eventKey: string;
    teamKey: string;
  }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["complement", eventKey, teamKey],
    queryFn: () => fetchComplements(eventKey!, teamKey!),
    enabled: !!eventKey && !!teamKey,
  });

  const target = data?.target_team;
  const radarData = target
    ? [
        { stat: "Auto", value: target.auto_epa ?? 0 },
        { stat: "Teleop", value: target.teleop_epa ?? 0 },
        { stat: "Endgame", value: target.endgame_epa ?? 0 },
      ]
    : [];

  return (
    <div>
      <Link
        to={`/event/${eventKey}`}
        className="text-sm text-blue-400 hover:underline"
      >
        &larr; Back to Event
      </Link>
      <h1 className="mt-2 mb-2 text-3xl font-bold">Team Complements</h1>

      {isLoading && (
        <div className="flex items-center gap-3 text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          Finding best complements...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-4 text-red-300">
          Failed to find complements.
        </div>
      )}

      {target && (
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 lg:col-span-1">
            <h2 className="mb-2 text-lg font-semibold">
              <span className="font-mono text-blue-400">
                {target.team_number}
              </span>{" "}
              {target.nickname}
            </h2>
            <div className="mb-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Overall EPA</span>
                <span className="text-yellow-400">{epa(target.epa)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Auto</span>
                <span className="text-green-400">{epa(target.auto_epa)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Teleop</span>
                <span className="text-purple-400">
                  {epa(target.teleop_epa)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Endgame</span>
                <span className="text-orange-400">
                  {epa(target.endgame_epa)}
                </span>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <PolarRadiusAxis tick={{ fill: "#6B7280", fontSize: 10 }} />
                  <Radar
                    dataKey="value"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold">
              Best Complement Teams
            </h2>
            <div className="space-y-3">
              {data.complements.map(
                (c: ComplementCandidate, idx: number) => (
                  <div
                    key={c.team.team_key}
                    className="rounded-lg border border-gray-800 bg-gray-900 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="mr-3 text-sm text-gray-500">
                          #{idx + 1}
                        </span>
                        <span className="font-mono text-lg font-semibold text-blue-400">
                          {c.team.team_number}
                        </span>
                        <span className="ml-2 text-gray-300">
                          {c.team.nickname}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          Fit Score
                        </div>
                        <div className="text-lg font-bold text-yellow-400">
                          {c.overall_fit_score.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Combined EPA: </span>
                        <span className="text-yellow-400">
                          {c.combined_epa.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Synergy: </span>
                        <span>{c.synergy_score.toFixed(1)}</span>
                      </div>
                      {c.strength_areas.length > 0 && (
                        <div>
                          <span className="text-gray-500">Strong in: </span>
                          {c.strength_areas.map((s) => (
                            <span
                              key={s}
                              className="mr-1 rounded bg-green-900 px-2 py-0.5 text-xs text-green-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {c.weakness_coverage.length > 0 && (
                        <div>
                          <span className="text-gray-500">Covers: </span>
                          {c.weakness_coverage.map((w) => (
                            <span
                              key={w}
                              className="mr-1 rounded bg-blue-900 px-2 py-0.5 text-xs text-blue-300"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex gap-4 text-xs text-gray-400">
                      <span>
                        EPA: {epa(c.team.epa)}
                      </span>
                      <span className="text-green-400">
                        Auto: {epa(c.team.auto_epa)}
                      </span>
                      <span className="text-purple-400">
                        Teleop: {epa(c.team.teleop_epa)}
                      </span>
                      <span className="text-orange-400">
                        Endgame: {epa(c.team.endgame_epa)}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
