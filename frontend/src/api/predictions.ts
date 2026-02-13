import api from "./client";
import type {
  AllianceWeights,
  OptimalAlliancesResponse,
  ComplementResponse,
} from "../types";

export async function predictAlliances(
  eventKey: string,
  weights?: AllianceWeights
): Promise<OptimalAlliancesResponse> {
  const { data } = await api.post<OptimalAlliancesResponse>(
    "/api/predict/optimal-alliances",
    { event_key: eventKey, weights }
  );
  return data;
}

export async function fetchComplements(
  eventKey: string,
  teamKey: string
): Promise<ComplementResponse> {
  const { data } = await api.get<ComplementResponse>(
    `/api/complement/${eventKey}/${teamKey}`
  );
  return data;
}
