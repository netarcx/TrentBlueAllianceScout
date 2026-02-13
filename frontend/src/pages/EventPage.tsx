import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchTeamsForEvent } from "../api/events";
import { fetchMatchVideo } from "../api/matches";
import type { TeamEvent } from "../types";

type SortField = "rank" | "team_number" | "epa" | "auto_epa" | "teleop_epa" | "endgame_epa";

function epaDisplay(val: number | null): string {
  if (val === null || val === undefined) return "-";
  return val.toFixed(1);
}

function yearFromEventKey(eventKey: string): number {
  const match = eventKey.match(/^(\d{4})/);
  return match ? parseInt(match[1]) : new Date().getFullYear();
}

function VideoButtons({ teamKey, year }: { teamKey: string; year: number }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function openVideo(kind: "best" | "worst" | "random") {
    setLoading(kind);
    try {
      const video = await fetchMatchVideo(teamKey, year, kind);
      window.open(video.youtube_url, "_blank");
    } catch {
      alert("No match video found for this team");
    }
    setLoading(null);
  }

  return (
    <span className="inline-flex gap-1">
      <button
        onClick={() => openVideo("best")}
        disabled={loading !== null}
        title="Best match video"
        className="rounded bg-green-800 px-1.5 py-0.5 text-[10px] font-medium text-green-200 hover:bg-green-700 disabled:opacity-50"
      >
        {loading === "best" ? "..." : "Best"}
      </button>
      <button
        onClick={() => openVideo("worst")}
        disabled={loading !== null}
        title="Worst match video"
        className="rounded bg-red-800 px-1.5 py-0.5 text-[10px] font-medium text-red-200 hover:bg-red-700 disabled:opacity-50"
      >
        {loading === "worst" ? "..." : "Worst"}
      </button>
      <button
        onClick={() => openVideo("random")}
        disabled={loading !== null}
        title="Random match video"
        className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-200 hover:bg-gray-600 disabled:opacity-50"
      >
        {loading === "random" ? "..." : "Rand"}
      </button>
    </span>
  );
}

export default function EventPage() {
  const { eventKey } = useParams<{ eventKey: string }>();
  const [sortField, setSortField] = useState<SortField>("epa");
  const [sortAsc, setSortAsc] = useState(false);

  const year = yearFromEventKey(eventKey ?? "");

  const { data: teams, isLoading, error } = useQuery({
    queryKey: ["teams", eventKey],
    queryFn: () => fetchTeamsForEvent(eventKey!),
    enabled: !!eventKey,
  });

  const sorted = teams?.slice().sort((a: TeamEvent, b: TeamEvent) => {
    let aVal = a[sortField] ?? (sortAsc ? Infinity : -Infinity);
    let bVal = b[sortField] ?? (sortAsc ? Infinity : -Infinity);
    return sortAsc
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "rank" || field === "team_number");
    }
  }

  function SortHeader({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field;
    return (
      <th
        className="cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hover:text-gray-200"
        onClick={() => toggleSort(field)}
      >
        {label}
        {active && (
          <span className="ml-1">{sortAsc ? "\u25B2" : "\u25BC"}</span>
        )}
      </th>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-blue-400 hover:underline">
            &larr; Back to Events
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{eventKey}</h1>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/event/${eventKey}/predictions`}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500"
          >
            Predict Alliances
          </Link>
          <Link
            to={`/event/${eventKey}/draft`}
            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-500"
          >
            Start Draft
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          Loading teams...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-4 text-red-300">
          Failed to load teams.
        </div>
      )}

      {sorted && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800 bg-gray-900">
              <tr>
                <SortHeader field="rank" label="Rank" />
                <SortHeader field="team_number" label="Team" />
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Name
                </th>
                <SortHeader field="epa" label="EPA" />
                <SortHeader field="auto_epa" label="Auto" />
                <SortHeader field="teleop_epa" label="Teleop" />
                <SortHeader field="endgame_epa" label="Endgame" />
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Record
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Videos
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sorted.map((team: TeamEvent) => (
                <tr
                  key={team.team_key}
                  className="bg-gray-950 hover:bg-gray-900"
                >
                  <td className="px-3 py-2 text-gray-400">
                    {team.rank ?? "-"}
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-blue-400">
                    {team.team_number}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2">
                    {team.nickname || "-"}
                  </td>
                  <td className="px-3 py-2 font-semibold text-yellow-400">
                    {epaDisplay(team.epa)}
                  </td>
                  <td className="px-3 py-2 text-green-400">
                    {epaDisplay(team.auto_epa)}
                  </td>
                  <td className="px-3 py-2 text-purple-400">
                    {epaDisplay(team.teleop_epa)}
                  </td>
                  <td className="px-3 py-2 text-orange-400">
                    {epaDisplay(team.endgame_epa)}
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {team.wins}-{team.losses}-{team.ties}
                  </td>
                  <td className="px-3 py-2">
                    <VideoButtons teamKey={team.team_key} year={year} />
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/event/${eventKey}/complement/${team.team_key}`}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Find Complements
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
