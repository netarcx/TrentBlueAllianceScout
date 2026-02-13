import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { predictAlliances } from "../api/predictions";
import type { AllianceWeights, PredictedAlliance } from "../types";

const ALLIANCE_COLORS = [
  "border-red-500",
  "border-blue-500",
  "border-green-500",
  "border-yellow-500",
  "border-purple-500",
  "border-pink-500",
  "border-cyan-500",
  "border-orange-500",
];

export default function PredictionsPage() {
  const { eventKey } = useParams<{ eventKey: string }>();
  const [weights, setWeights] = useState<AllianceWeights>({
    auto: 1.0,
    teleop: 1.0,
    endgame: 1.0,
    consistency: 0.5,
    synergy: 0.3,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["predictions", eventKey, weights],
    queryFn: () => predictAlliances(eventKey!, weights),
    enabled: !!eventKey,
  });

  function handleWeightChange(key: keyof AllianceWeights, val: number) {
    setWeights((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/event/${eventKey}`}
          className="text-sm text-blue-400 hover:underline"
        >
          &larr; Back to Event
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Predicted Alliances</h1>
        <p className="text-gray-400">{eventKey}</p>
      </div>

      <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">
          Weight Tuning
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {(
            Object.entries(weights) as [keyof AllianceWeights, number][]
          ).map(([key, val]) => (
            <div key={key}>
              <label className="mb-1 block text-xs capitalize text-gray-400">
                {key}: {val.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={val}
                onChange={(e) =>
                  handleWeightChange(key, parseFloat(e.target.value))
                }
                className="w-full accent-blue-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => refetch()}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Recalculate
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          Computing optimal alliances...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-4 text-red-300">
          Failed to compute predictions. Make sure teams are loaded first.
        </div>
      )}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.alliances.map((alliance: PredictedAlliance, idx: number) => (
            <div
              key={alliance.rank}
              className={`rounded-lg border-l-4 ${ALLIANCE_COLORS[idx] || "border-gray-500"} bg-gray-900 p-4`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-lg font-bold">
                  Alliance #{alliance.rank}
                </span>
                <span className="rounded bg-gray-800 px-2 py-1 text-xs font-mono text-yellow-400">
                  {alliance.total_score.toFixed(1)}
                </span>
              </div>

              <div className="mb-3 space-y-2">
                {alliance.teams.map((team, i) => (
                  <div
                    key={team.team_key}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-semibold text-blue-400">
                        {team.team_number}
                      </span>
                      {i === 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          Captain
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-400">
                      {team.epa?.toFixed(1) ?? "-"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Combined EPA</span>
                  <span className="text-yellow-400">
                    {alliance.combined_epa.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Auto</span>
                  <span className="text-green-400">
                    {alliance.auto_epa_sum.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Teleop</span>
                  <span className="text-purple-400">
                    {alliance.teleop_epa_sum.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Endgame</span>
                  <span className="text-orange-400">
                    {alliance.endgame_epa_sum.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Synergy</span>
                  <span>{alliance.synergy_score.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
