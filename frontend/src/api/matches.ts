import api from "./client";

export interface MatchVideo {
  match_key: string;
  event_key: string;
  comp_level: string;
  match_number: number;
  alliance_color: string;
  alliance_score: number;
  opponent_score: number;
  youtube_key: string;
  youtube_url: string;
}

export async function fetchMatchVideo(
  teamKey: string,
  year: number,
  kind: "best" | "worst" | "random"
): Promise<MatchVideo> {
  const { data } = await api.get<MatchVideo>(
    `/api/team/${teamKey}/match-video/${year}/${kind}`
  );
  return data;
}
