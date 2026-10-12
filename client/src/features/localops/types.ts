export interface Session {
  can_manage: boolean;
  can_triage: boolean;
}
export interface Role {
  id: string;
  name: string;
  permissions: string[];
}
export interface Assignment {
  user_id: string;
  role_id: string;
}
export interface TaskRule {
  card_id: string;
  title: string;
  user_id: string;
  permissions: string[];
}
export interface Ticket {
  id: string;
  title: string;
  body: string;
  status: string;
  priority: string;
  requester_id: string;
  card_id?: string;
  requester_name: string;
  assignee_id?: string;
  created_at: string;
  response_due_at: string;
  resolution_due_at: string;
  responded_at?: string;
  resolved_at?: string;
}
export interface Message {
  id: string;
  body: string;
  internal: number;
  author: string;
  created_at: string;
}
export interface Article {
  id: string;
  title: string;
  body: string;
  published: number;
}
export interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: number;
  manifest: Record<string, unknown>;
}
