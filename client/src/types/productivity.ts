export interface ProductivityInput {
  user_id?: string;
  weekly_hours?: number;
  permissions?: string[];
  title?: string;
  description?: string;
  name?: string;
  card_id?: string | null;
  project_id?: string;
  column_id?: string;
  work_type_id?: string | null;
  repeat_days?: number | null;
  reminder_minutes?: number | null;
  start_at?: string;
  end_at?: string;
  from_column?: string;
  to_column?: string;
  require_description?: boolean;
  require_checklists?: boolean;
  require_approval?: boolean;
  allowed_role?: string;
  done?: boolean;
  transition_id?: string;
}
export interface InboxItem {
  id: string;
  title: string;
  description: string;
  done: number;
  created_at: string;
}
export interface PlannerSlot {
  id: string;
  card_id: string | null;
  title: string;
  start_at: string;
  end_at: string;
}
export interface WorkCard {
  assignee_ids: string;
  status_type: string;
  id: string;
  project_id: string;
  project_name: string;
  column_id: string;
  status: string;
  title: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  story_points: number | null;
  work_type: string | null;
  assignees: string;
}
export interface ProjectResource {
  id: string;
  transition_id?: string;
  name?: string;
  card_id?: string;
  work_type_id?: string | null;
  repeat_days?: number | null;
  reminder_minutes?: number | null;
  from_column?: string;
  to_column?: string;
  require_description?: number;
  require_checklists?: number;
  require_approval?: number;
  allowed_role?: string;
  requested_by?: string;
  approved_by?: string | null;
  revision?: string;
}
