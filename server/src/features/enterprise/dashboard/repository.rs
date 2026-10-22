use super::dto::*;
use crate::error::AppError;
use sqlx::SqlitePool;

// Every task-derived value, including counts and dependencies, shares this visibility scope.
const SCOPE: &str = r#"WITH visible AS (
 SELECT p.*, CASE WHEN wm.role IN ('owner','admin','viewer') THEN wm.role ELSE COALESCE(pm.role,wm.role) END AS effective_role
 FROM projects p JOIN workspace_members wm ON wm.workspace_id=p.workspace_id AND wm.user_id=?1
 LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=?1
 WHERE p.workspace_id=?2 AND p.archived_at IS NULL AND (p.visibility='public' OR wm.role IN ('owner','admin') OR pm.user_id IS NOT NULL)
), work AS (
 SELECT c.id,c.title,c.project_id,p.name AS project_name,col.name AS status,col.type AS status_type,c.priority,c.due_date,
 EXISTS(SELECT 1 FROM card_assignees a WHERE a.card_id=c.id AND a.user_id=?1) AS mine,
 EXISTS(SELECT 1 FROM card_links l JOIN cards blocker ON
 ((l.link_type='blocks' AND l.target_card_id=c.id AND blocker.id=l.source_card_id) OR
 (l.link_type='blocked_by' AND l.source_card_id=c.id AND blocker.id=l.target_card_id))
 JOIN columns bc ON bc.id=blocker.column_id JOIN visible bp ON bp.id=blocker.project_id
 WHERE blocker.archived_at IS NULL AND bc.type!='done' AND blocker.id!=c.id) AS blocked
 FROM cards c JOIN visible p ON p.id=c.project_id JOIN columns col ON col.id=c.column_id WHERE c.archived_at IS NULL AND c.is_template=0
) "#;

pub async fn summary(
    pool: &SqlitePool,
    user: &str,
    workspace: &str,
    today: &str,
) -> Result<Summary, AppError> {
    Ok(sqlx::query_as(&format!("{SCOPE} SELECT (SELECT count(*) FROM visible) AS projects,count(*) AS tasks,COALESCE(sum(status_type!='done'),0) AS pending,COALESCE(sum(status_type='done'),0) AS completed,COALESCE(sum(status_type!='done' AND substr(due_date,1,10)<?3),0) AS overdue,COALESCE(sum(status_type!='done' AND priority='urgent'),0) AS urgent,COALESCE(sum(status_type!='done' AND blocked),0) AS blocked,COALESCE(sum(status_type!='done' AND mine),0) AS mine FROM work"))
        .bind(user).bind(workspace).bind(today).fetch_one(pool).await?)
}
pub async fn projects(
    pool: &SqlitePool,
    user: &str,
    workspace: &str,
    today: &str,
) -> Result<Vec<Project>, AppError> {
    Ok(sqlx::query_as(&format!("{SCOPE} SELECT p.id,p.name,p.identifier,p.color,count(w.id) AS total,COALESCE(sum(w.status_type='done'),0) AS completed,COALESCE(sum(w.status_type!='done' AND substr(w.due_date,1,10)<?3),0) AS overdue,min(CASE WHEN w.status_type!='done' THEN w.due_date END) AS next_due,p.effective_role!='viewer' AS can_write FROM visible p LEFT JOIN work w ON w.project_id=p.id GROUP BY p.id ORDER BY overdue DESC,p.name,p.id"))
        .bind(user).bind(workspace).bind(today).fetch_all(pool).await?)
}
pub enum TaskList {
    MineOverdue,
    MineToday,
    MineUpcoming,
    Attention,
    Deadlines,
}
pub async fn tasks(
    pool: &SqlitePool,
    user: &str,
    workspace: &str,
    today: &str,
    end: &str,
    kind: TaskList,
) -> Result<Vec<Task>, AppError> {
    let filter = match kind {
        TaskList::MineOverdue => "mine AND substr(due_date,1,10)<?3",
        TaskList::MineToday => "mine AND substr(due_date,1,10)=?3",
        TaskList::MineUpcoming => "mine AND (due_date IS NULL OR substr(due_date,1,10)>?3)",
        TaskList::Attention => "(substr(due_date,1,10)<?3 OR priority='urgent' OR blocked)",
        TaskList::Deadlines => "substr(due_date,1,10)>=?3 AND substr(due_date,1,10)<?4",
    };
    let sql=format!("{SCOPE} SELECT id,title,project_id,project_name,status,priority,due_date,blocked FROM work WHERE status_type!='done' AND {filter} ORDER BY due_date IS NULL,substr(due_date,1,10),CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,id LIMIT 6");
    // Numbered parameters stay stable across the independently bounded lists.
    let mut q = sqlx::query_as(&sql).bind(user).bind(workspace).bind(today);
    if matches!(kind, TaskList::Deadlines) {
        q = q.bind(end);
    }
    Ok(q.fetch_all(pool).await?)
}
pub async fn notes(pool: &SqlitePool, user: &str, workspace: &str) -> Result<Vec<Note>, AppError> {
    Ok(sqlx::query_as("SELECT id,title,workspace_id,updated_at FROM notes WHERE deleted_at IS NULL AND pinned=1 AND (owner_id=? OR workspace_id=?) ORDER BY updated_at DESC,id DESC LIMIT 6").bind(user).bind(workspace).fetch_all(pool).await?)
}
pub async fn activity(
    pool: &SqlitePool,
    user: &str,
    workspace: &str,
) -> Result<Vec<Activity>, AppError> {
    // Use current, permission-filtered titles and a safe action name, never raw audit payloads.
    Ok(sqlx::query_as(&format!("{SCOPE} SELECT a.id,a.card_id,a.project_id,p.name AS project_name,c.title AS task_title,COALESCE(u.display_name,'System') AS actor_name,a.action,a.created_at FROM activities a JOIN visible p ON p.id=a.project_id JOIN cards c ON c.id=a.card_id AND c.project_id=p.id LEFT JOIN users u ON u.id=a.actor_id WHERE a.workspace_id=?2 AND a.action IN ('created_card','moved_card','updated_card','archived_card','restored_card','assigned_card','unassigned_card','api_mutation') ORDER BY a.created_at DESC,a.id DESC LIMIT 8"))
        .bind(user).bind(workspace).fetch_all(pool).await?)
}
