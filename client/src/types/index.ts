export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  role: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  owner_id: string;
  user_role: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  role: string;
  joined_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  identifier: string;
  description?: string | null;
  color?: string | null;
  cover_url?: string | null;
  visibility: string;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  name: string;
  type_: string;
  position: f64Number;
  wip_limit?: number | null;
  created_at: string;
}

export type f64Number = number;

export interface Board {
  id: string;
  project_id: string;
  name: string;
  columns: BoardColumn[];
  created_at: string;
}

export interface CardAssignee {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface CardLabel {
  id: string;
  name: string;
  color: string;
}

export interface Card {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  description?: string | null;
  priority: "urgent" | "high" | "medium" | "low" | "no_priority" | string;
  position: number;
  creator_id?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  estimated_hours?: number | null;
  cover_url?: string | null;
  archived_at?: string | null;
  assignees: CardAssignee[];
  labels: CardLabel[];
  checklist_total: number;
  checklist_completed: number;
  comments_count: number;
  is_template?: boolean;
  story_points?: number | null;
  watchers_count?: number;
  is_watched?: boolean;
  votes_count?: number;
  has_voted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardWatcher {
  card_id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface CardLink {
  id: string;
  source_card_id: string;
  target_card_id: string;
  target_card_title: string;
  link_type: "blocks" | "blocked_by" | "relates_to" | string;
  created_at: string;
}

export interface ActiveTimer {
  id: string;
  card_id: string;
  user_id: string;
  started_at: string;
  description?: string | null;
}

export interface CustomFieldDefinition {
  id: string;
  project_id: string;
  name: string;
  field_type:
    "text" | "number" | "currency" | "dropdown" | "checkbox" | "date" | string;
  options: string[];
  position: number;
  created_at: string;
}

export interface CustomFieldValue {
  id: string;
  card_id: string;
  field_id: string;
  field_name: string;
  field_type: string;
  options: string[];
  value_text?: string | null;
  value_number?: number | null;
  updated_at: string;
}

export interface CommentReaction {
  emoji: string;
  count: number;
  user_ids: string[];
}

export interface CardComment {
  is_internal?: boolean;
  id: string;
  card_id: string;
  author_id?: string | null;
  author_name: string;
  author_avatar?: string | null;
  body: string;
  edited_at?: string | null;
  reactions: CommentReaction[];
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  title: string;
  is_done: boolean;
  position: number;
  assignee_id?: string | null;
  due_date?: string | null;
  created_at: string;
}

export interface Checklist {
  id: string;
  card_id: string;
  title: string;
  position: number;
  items: ChecklistItem[];
  created_at: string;
}

export interface Label {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: "planned" | "active" | "completed" | string;
  card_ids: string[];
  created_at: string;
}

export interface TimeLog {
  id: string;
  card_id: string;
  user_id?: string | null;
  user_name: string;
  minutes: number;
  logged_at: string;
  description?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type_: string;
  read_at?: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface SearchResultItem {
  card_id: string;
  project_id: string;
  project_name: string;
  title: string;
  description?: string | null;
  priority: string;
}

export type {
  EnterpriseResource,
  ResourceInput,
  CardMetadata,
  SprintSnapshot,
  AuditEntry,
  PersonalToken,
  BoardPreferences,
} from "./enterprise";
