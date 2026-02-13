export interface Event {
  key: string;
  name: string;
  event_type: number | null;
  year: number;
  city: string | null;
  state_prov: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  week: number | null;
}

export interface TeamEvent {
  team_key: string;
  event_key: string;
  team_number: number;
  nickname: string | null;
  rank: number | null;
  wins: number;
  losses: number;
  ties: number;
  epa: number | null;
  auto_epa: number | null;
  teleop_epa: number | null;
  endgame_epa: number | null;
  rp_1_epa: number | null;
  rp_2_epa: number | null;
}

export interface PredictedAlliance {
  rank: number;
  teams: TeamEvent[];
  combined_epa: number;
  auto_epa_sum: number;
  teleop_epa_sum: number;
  endgame_epa_sum: number;
  synergy_score: number;
  total_score: number;
}

export interface AllianceWeights {
  auto: number;
  teleop: number;
  endgame: number;
  consistency: number;
  synergy: number;
}

export interface OptimalAlliancesResponse {
  event_key: string;
  alliances: PredictedAlliance[];
}

export interface DraftPick {
  round: number;
  alliance_number: number;
  team: TeamEvent;
}

export interface DraftState {
  session_id: string;
  event_key: string;
  round: number;
  current_alliance: number;
  pick_direction: string;
  alliances: Record<string, TeamEvent[]>;
  available_teams: TeamEvent[];
  pick_history: DraftPick[];
  is_complete: boolean;
}

export interface ComplementCandidate {
  team: TeamEvent;
  combined_epa: number;
  synergy_score: number;
  strength_areas: string[];
  weakness_coverage: string[];
  overall_fit_score: number;
}

export interface ComplementResponse {
  target_team: TeamEvent;
  complements: ComplementCandidate[];
}
