import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchEvents } from "../api/events";
import type { Event } from "../types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2014 }, (_, i) => CURRENT_YEAR - i);

const EVENT_TYPE_LABELS: Record<number, string> = {
  0: "Regional",
  1: "District",
  2: "District Championship",
  3: "Championship Division",
  4: "Championship Finals",
  5: "District Event",
  6: "Festival of Champions",
  99: "Offseason",
  100: "Preseason",
};

function eventTypeLabel(t: number | null): string {
  if (t === null) return "Other";
  return EVENT_TYPE_LABELS[t] ?? "Other";
}

export default function HomePage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [search, setSearch] = useState("");

  const { data: events, isLoading, error } = useQuery({
    queryKey: ["events", year],
    queryFn: () => fetchEvents(year),
  });

  // event_type 1 = District, 2 = District Championship, 5 = District Event
  const DISTRICT_TYPES = new Set([1, 2, 5]);
  const HIDDEN_EVENTS = new Set(["blue twilight week zero"]);
  const PRIORITY_STATES = new Set(["MN", "ND", "IA", "Minnesota", "North Dakota", "Iowa"]);

  const filtered = events
    ?.filter((e: Event) => !DISTRICT_TYPES.has(e.event_type ?? -1))
    .filter((e: Event) => !HIDDEN_EVENTS.has(e.name.toLowerCase()))
    .filter((e: Event) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q) ||
        e.state_prov?.toLowerCase().includes(q) ||
        e.key.toLowerCase().includes(q)
      );
    })
    .sort((a: Event, b: Event) => {
      const aPriority = PRIORITY_STATES.has(a.state_prov ?? "") ? 0 : 1;
      const bPriority = PRIORITY_STATES.has(b.state_prov ?? "") ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return (a.start_date ?? "").localeCompare(b.start_date ?? "");
    });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Select an Event</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 placeholder-gray-500"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          Loading events...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-4 text-red-300">
          Failed to load events. Check your API key and try again.
        </div>
      )}

      {filtered && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event: Event) => (
            <Link
              key={event.key}
              to={`/event/${event.key}`}
              className="rounded-lg border border-gray-800 bg-gray-900 p-4 transition hover:border-blue-500 hover:bg-gray-800"
            >
              <div className="mb-1 text-xs font-medium text-blue-400">
                {eventTypeLabel(event.event_type)}
                {event.week != null && ` - Week ${event.week + 1}`}
              </div>
              <h3 className="mb-1 font-semibold text-gray-100">
                {event.name}
              </h3>
              <p className="text-sm text-gray-400">
                {[event.city, event.state_prov, event.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {event.start_date && (
                <p className="mt-1 text-xs text-gray-500">
                  {event.start_date}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <p className="text-gray-500">No events found.</p>
      )}
    </div>
  );
}
