import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { startDraft, makePick, autoPick, autoComplete } from "../api/draft";
import type { DraftState, TeamEvent } from "../types";

function epa(val: number | null): string {
  return val !== null && val !== undefined ? val.toFixed(1) : "-";
}

export default function DraftPage() {
  const { eventKey } = useParams<{ eventKey: string }>();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!eventKey) return;
    setLoading(true);
    setError(null);
    try {
      const state = await startDraft(eventKey);
      setDraft(state);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to start draft");
    }
    setLoading(false);
  }

  async function handlePick(teamKey: string) {
    if (!draft) return;
    setLoading(true);
    try {
      const state = await makePick(draft.session_id, teamKey);
      setDraft(state);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to make pick");
    }
    setLoading(false);
  }

  async function handleAutoPick() {
    if (!draft) return;
    setLoading(true);
    try {
      const state = await autoPick(draft.session_id);
      setDraft(state);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Auto pick failed");
    }
    setLoading(false);
  }

  async function handleAutoComplete() {
    if (!draft) return;
    setLoading(true);
    setError(null);
    try {
      const state = await autoComplete(draft.session_id);
      setDraft(state);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Auto complete failed");
    }
    setLoading(false);
  }

  if (!draft) {
    return (
      <div>
        <Link
          to={`/event/${eventKey}`}
          className="text-sm text-blue-400 hover:underline"
        >
          &larr; Back to Event
        </Link>
        <h1 className="mt-2 mb-6 text-3xl font-bold">Draft Simulator</h1>
        <p className="mb-4 text-gray-400">
          Simulate the FRC alliance selection snake draft for {eventKey}.
        </p>
        <button
          onClick={handleStart}
          disabled={loading}
          className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start Draft"}
        </button>
        {error && (
          <p className="mt-4 text-red-400">{error}</p>
        )}
      </div>
    );
  }

  const allianceNums = Object.keys(draft.alliances)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div>
      <Link
        to={`/event/${eventKey}`}
        className="text-sm text-blue-400 hover:underline"
      >
        &larr; Back to Event
      </Link>
      <h1 className="mt-2 mb-4 text-3xl font-bold">Draft Simulator</h1>

      {!draft.is_complete && (
        <div className="mb-6 flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div>
            <span className="text-sm text-gray-400">Round {draft.round}</span>
            <span className="mx-2 text-gray-600">|</span>
            <span className="font-semibold text-yellow-400">
              Alliance {draft.current_alliance} is picking
            </span>
            <span className="mx-2 text-gray-600">|</span>
            <span className="text-sm text-gray-400 capitalize">
              {draft.pick_direction}
            </span>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleAutoPick}
              disabled={loading}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
            >
              {loading ? "Picking..." : "Auto Pick (AI)"}
            </button>
            <button
              onClick={handleAutoComplete}
              disabled={loading}
              className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-500 disabled:opacity-50"
            >
              {loading ? "Simulating..." : "Auto Complete Draft"}
            </button>
          </div>
        </div>
      )}

      {draft.is_complete && (
        <div className="mb-6 rounded-lg border border-green-800 bg-green-900/30 p-4 text-green-300">
          Draft complete! All alliances have been formed.
        </div>
      )}

      {error && (
        <p className="mb-4 text-red-400">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alliances */}
        <div className="lg:col-span-1">
          <h2 className="mb-3 text-lg font-semibold">Alliances</h2>
          <div className="space-y-2">
            {allianceNums.map((num) => {
              const teams = draft.alliances[String(num)];
              const isActive =
                !draft.is_complete && draft.current_alliance === num;
              return (
                <div
                  key={num}
                  className={`rounded-lg border p-3 ${
                    isActive
                      ? "border-yellow-500 bg-yellow-900/20"
                      : "border-gray-800 bg-gray-900"
                  }`}
                >
                  <div className="mb-1 text-sm font-semibold text-gray-400">
                    Alliance {num}
                  </div>
                  <div className="space-y-1">
                    {teams.map((t: TeamEvent, i: number) => (
                      <div
                        key={t.team_key}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          <span className="font-mono font-semibold text-blue-400">
                            {t.team_number}
                          </span>
                          {i === 0 && (
                            <span className="ml-1 text-xs text-gray-500">
                              (C)
                            </span>
                          )}
                        </span>
                        <span className="text-yellow-400">
                          {epa(t.epa)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Teams */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">
            Available Teams ({draft.available_teams.length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800 bg-gray-900">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    Team
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    EPA
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    Auto
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    Teleop
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-400">
                    Endgame
                  </th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {draft.available_teams
                  .slice()
                  .sort(
                    (a: TeamEvent, b: TeamEvent) =>
                      (b.epa ?? 0) - (a.epa ?? 0)
                  )
                  .map((team: TeamEvent) => (
                    <tr
                      key={team.team_key}
                      className="bg-gray-950 hover:bg-gray-900"
                    >
                      <td className="px-3 py-2 font-mono font-semibold text-blue-400">
                        {team.team_number}
                      </td>
                      <td className="max-w-[150px] truncate px-3 py-2">
                        {team.nickname || "-"}
                      </td>
                      <td className="px-3 py-2 text-yellow-400">
                        {epa(team.epa)}
                      </td>
                      <td className="px-3 py-2 text-green-400">
                        {epa(team.auto_epa)}
                      </td>
                      <td className="px-3 py-2 text-purple-400">
                        {epa(team.teleop_epa)}
                      </td>
                      <td className="px-3 py-2 text-orange-400">
                        {epa(team.endgame_epa)}
                      </td>
                      <td className="px-3 py-2">
                        {!draft.is_complete && (
                          <button
                            onClick={() => handlePick(team.team_key)}
                            disabled={loading}
                            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                          >
                            Pick
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Draft History */}
      {draft.pick_history.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Draft History</h2>
          <div className="flex flex-wrap gap-2">
            {draft.pick_history.map((pick, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm"
              >
                <span className="text-gray-500">R{pick.round}</span>
                <span className="mx-1 text-gray-600">|</span>
                <span className="text-gray-400">A{pick.alliance_number}</span>
                <span className="mx-1 text-gray-600">&rarr;</span>
                <span className="font-mono font-semibold text-blue-400">
                  {pick.team.team_number}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
