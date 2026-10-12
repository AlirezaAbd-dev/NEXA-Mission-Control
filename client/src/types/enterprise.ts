export interface EnterpriseResource {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  color?: string;
  status?: string;
  start_date?: string | null;
  target_date?: string | null;
  total?: number;
  done?: number;
  trigger_type?: string;
  action_type?: string;
  trigger_config_json?: string;
  action_config_json?: string;
  config_json?: string;
  is_active?: number;
  runs?: number;
  kind?: string;
  url?: string;
  card_id?: string | null;
  created_at?: string;
}
export interface ResourceInput {
  name: string;
  summary?: string;
  color?: string;
  status?: string;
  start_date?: string;
  target_date?: string;
  config?: Record<string, unknown>;
  trigger_type?: string;
  action_type?: string;
  trigger_config?: Record<string, unknown>;
  action_config?: Record<string, unknown>;
  is_active?: boolean;
  kind?: string;
  url?: string;
  card_id?: string;
}
export interface CardMetadata {
  id: string;
  epic_id: string | null;
  parent_id: string | null;
  release_id: string | null;
  sla_due_at: string | null;
  sla_response_due_at?: string | null;
  first_response_at?: string | null;
  resolved_at?: string | null;
}
export interface SprintSnapshot {
  sprint_id: string;
  name: string;
  status: string;
  day: string | null;
  committed: number;
  completed: number;
  committed_points: number | null;
  remaining_points: number | null;
  start_date: string | null;
  end_date: string | null;
}
export interface AuditEntry {
  id: string;
  action: string;
  actor_name: string | null;
  card_id: string | null;
  payload: string;
  created_at: string;
}
export interface PersonalToken {
  id: string;
  name: string;
  expires_at: string;
  created_at: string;
}
export interface BoardPreferences {
  grouping?: string;
  background?: string;
  starred?: boolean;
}
