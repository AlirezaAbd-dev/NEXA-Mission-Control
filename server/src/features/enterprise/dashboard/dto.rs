use serde::{Deserialize, Serialize};
#[derive(Deserialize)]
pub struct Query {
    pub today: String,
}
#[derive(Serialize, sqlx::FromRow)]
pub struct Summary {
    pub projects: i64,
    pub tasks: i64,
    pub pending: i64,
    pub completed: i64,
    pub overdue: i64,
    pub urgent: i64,
    pub blocked: i64,
    pub mine: i64,
}
#[derive(Serialize, sqlx::FromRow)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub identifier: String,
    pub color: Option<String>,
    pub total: i64,
    pub completed: i64,
    pub overdue: i64,
    pub next_due: Option<String>,
    pub can_write: bool,
}
#[derive(Serialize, sqlx::FromRow)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub project_id: String,
    pub project_name: String,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub blocked: bool,
}
#[derive(Serialize, sqlx::FromRow)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub workspace_id: Option<String>,
    pub updated_at: String,
}
#[derive(Serialize, sqlx::FromRow)]
pub struct Activity {
    pub id: String,
    pub card_id: String,
    pub project_id: String,
    pub project_name: String,
    pub task_title: String,
    pub actor_name: String,
    pub action: String,
    pub created_at: String,
}
#[derive(Serialize)]
pub struct Dashboard {
    pub today: String,
    pub summary: Summary,
    pub projects: Vec<Project>,
    pub mine_overdue: Vec<Task>,
    pub mine_today: Vec<Task>,
    pub mine_upcoming: Vec<Task>,
    pub attention: Vec<Task>,
    pub deadlines: Vec<Task>,
    pub notes: Vec<Note>,
    pub activity: Vec<Activity>,
}
