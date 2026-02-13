import api from "./client";
import type { DraftState } from "../types";

export async function startDraft(
  eventKey: string,
  numRounds: number = 2
): Promise<DraftState> {
  const { data } = await api.post<DraftState>("/api/draft/start", {
    event_key: eventKey,
    num_rounds: numRounds,
  });
  return data;
}

export async function makePick(
  sessionId: string,
  teamKey: string
): Promise<DraftState> {
  const { data } = await api.post<DraftState>("/api/draft/pick", {
    session_id: sessionId,
    team_key: teamKey,
  });
  return data;
}

export async function autoPick(sessionId: string): Promise<DraftState> {
  const { data } = await api.post<DraftState>("/api/draft/auto-pick", {
    session_id: sessionId,
  });
  return data;
}

export async function autoComplete(sessionId: string): Promise<DraftState> {
  const { data } = await api.post<DraftState>("/api/draft/auto-complete", {
    session_id: sessionId,
  });
  return data;
}

export async function getDraftState(
  sessionId: string
): Promise<DraftState> {
  const { data } = await api.get<DraftState>(`/api/draft/${sessionId}`);
  return data;
}
