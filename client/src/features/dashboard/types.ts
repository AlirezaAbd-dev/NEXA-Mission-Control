export interface DashboardTask {
  id: string; title: string; project_id: string; project_name: string; status: string;
  priority: string; due_date: string | null; blocked: boolean;
}
export interface DashboardProject {
  id: string; name: string; identifier: string; color: string | null;
  total: number; completed: number; overdue: number; next_due: string | null; can_write: boolean;
}
export interface WorkspaceDashboard {
  today: string;
  summary: { projects: number; tasks: number; pending: number; completed: number; overdue: number; urgent: number; blocked: number; mine: number };
  projects: DashboardProject[];
  mine_overdue: DashboardTask[]; mine_today: DashboardTask[]; mine_upcoming: DashboardTask[];
  attention: DashboardTask[]; deadlines: DashboardTask[];
  notes: { id: string; title: string; workspace_id: string | null; updated_at: string }[];
  activity: { id: string; card_id: string; project_id: string; project_name: string; task_title: string; actor_name: string; action: string; created_at: string }[];
}
