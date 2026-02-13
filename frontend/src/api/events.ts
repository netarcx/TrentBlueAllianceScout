import api from "./client";
import type { Event, TeamEvent } from "../types";

export async function fetchEvents(year: number): Promise<Event[]> {
  const { data } = await api.get<Event[]>("/api/events", {
    params: { year },
  });
  return data;
}

export async function fetchTeamsForEvent(
  eventKey: string
): Promise<TeamEvent[]> {
  const { data } = await api.get<TeamEvent[]>(
    `/api/events/${eventKey}/teams`
  );
  return data;
}
