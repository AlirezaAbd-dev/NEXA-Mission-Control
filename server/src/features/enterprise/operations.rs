use super::dto::*;
use crate::error::AppError;
use serde_json::{json, Value};
use sqlx::{SqliteConnection, SqlitePool};
pub async fn require_card(pool: &SqlitePool, project: &str, card: &str) -> Result<(), AppError> {
    if !card_in_project(&mut *pool.acquire().await?, project, card).await? {
        return Err(AppError::NotFound("Task not found in this project".into()));
    }
    Ok(())
}
pub async fn card_in_project(
    conn: &mut SqliteConnection,
    project: &str,
    card: &str,
) -> Result<bool, AppError> {
    Ok(
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM cards WHERE id=? AND project_id=?")
            .bind(card)
            .bind(project)
            .fetch_one(conn)
            .await?
            > 0,
    )
}
pub async fn require_column(
    pool: &SqlitePool,
    project: &str,
    column: &str,
) -> Result<(), AppError> {
    let n:i64=sqlx::query_scalar("SELECT COUNT(*) FROM columns c JOIN boards b ON b.id=c.board_id WHERE c.id=? AND b.project_id=?").bind(column).bind(project).fetch_one(pool).await?;
    if n == 0 {
        return Err(AppError::Validation(
            "Column belongs to another project".into(),
        ));
    }
    Ok(())
}
pub async fn require_member(pool: &SqlitePool, project: &str, user: &str) -> Result<(), AppError> {
    if super::repository::role(pool, project, user)
        .await?
        .is_none()
    {
        return Err(AppError::Validation(
            "Assignee is not a project member".into(),
        ));
    }
    Ok(())
}
pub async fn require_resource(
    pool: &SqlitePool,
    project: &str,
    table: &str,
    id: &str,
) -> Result<(), AppError> {
    if !matches!(table, "epics" | "releases") {
        return Err(AppError::Validation("Invalid resource".into()));
    }
    let n: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {table} WHERE id=? AND project_id=?"
    ))
    .bind(id)
    .bind(project)
    .fetch_one(pool)
    .await?;
    if n == 0 {
        return Err(AppError::Validation(
            "Item belongs to another project".into(),
        ));
    }
    Ok(())
}
pub async fn would_cycle(pool: &SqlitePool, card: &str, parent: &str) -> Result<bool, AppError> {
    Ok(sqlx::query_scalar::<_,i64>("WITH RECURSIVE ancestors(id,parent_id) AS (SELECT id,parent_id FROM cards WHERE id=? UNION SELECT c.id,c.parent_id FROM cards c JOIN ancestors a ON c.id=a.parent_id) SELECT COUNT(*) FROM ancestors WHERE id=?").bind(parent).bind(card).fetch_one(pool).await?>0)
}
pub async fn metadata(
    conn: &mut SqliteConnection,
    card: &str,
    r: &CardMetadataRequest,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE cards SET epic_id=?,parent_id=?,release_id=?,sla_due_at=?,sla_response_due_at=?,updated_at=? WHERE id=?",
    )
    .bind(&r.epic_id)
    .bind(&r.parent_id)
    .bind(&r.release_id)
    .bind(&r.sla_due_at)
    .bind(&r.sla_response_due_at)
    .bind(chrono::Utc::now().to_rfc3339())
    .bind(card)
    .execute(conn)
    .await?;
    Ok(())
}
pub async fn bulk_update(
    conn: &mut SqliteConnection,
    card: &str,
    r: &BulkRequest,
) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    match r.action.as_str() {
        "move" => {
            sqlx::query("UPDATE cards SET column_id=?,resolved_at=CASE WHEN EXISTS(SELECT 1 FROM columns WHERE id=? AND type='done') THEN COALESCE(resolved_at,?) ELSE NULL END,updated_at=? WHERE id=?")
                .bind(&r.value)
                .bind(&r.value)
                .bind(&now)
                .bind(&now)
                .bind(card)
                .execute(conn)
                .await?;
        }
        "priority" => {
            sqlx::query("UPDATE cards SET priority=?,updated_at=? WHERE id=?")
                .bind(&r.value)
                .bind(now)
                .bind(card)
                .execute(conn)
                .await?;
        }
        "archive" | "restore" => {
            sqlx::query("UPDATE cards SET archived_at=?,updated_at=? WHERE id=?")
                .bind(if r.action == "archive" {
                    Some(&now)
                } else {
                    None
                })
                .bind(&now)
                .bind(card)
                .execute(conn)
                .await?;
        }
        "assign" => {
            sqlx::query("DELETE FROM card_assignees WHERE card_id=?")
                .bind(card)
                .execute(&mut *conn)
                .await?;
            sqlx::query("INSERT INTO card_assignees(card_id,user_id) VALUES(?,?)")
                .bind(card)
                .bind(&r.value)
                .execute(conn)
                .await?;
        }
        _ => {}
    }
    Ok(())
}
pub async fn preferences(
    pool: &SqlitePool,
    project: &str,
    user: &str,
    value: Option<Value>,
) -> Result<Value, AppError> {
    if let Some(value) = value {
        sqlx::query("INSERT INTO board_preferences(project_id,user_id,config_json) VALUES(?,?,?) ON CONFLICT(project_id,user_id) DO UPDATE SET config_json=excluded.config_json").bind(project).bind(user).bind(value.to_string()).execute(pool).await?;
        return Ok(value);
    }
    let raw: Option<String> = sqlx::query_scalar(
        "SELECT config_json FROM board_preferences WHERE project_id=? AND user_id=?",
    )
    .bind(project)
    .bind(user)
    .fetch_optional(pool)
    .await?;
    Ok(raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(json!({})))
}
pub async fn transition(
    conn: &mut SqliteConnection,
    project: &str,
    sprint: &str,
    r: &SprintTransition,
) -> Result<(), AppError> {
    let status: Option<String> =
        sqlx::query_scalar("SELECT status FROM sprints WHERE id=? AND project_id=?")
            .bind(sprint)
            .bind(project)
            .fetch_optional(&mut *conn)
            .await?;
    let status = status.ok_or_else(|| AppError::NotFound("Sprint not found".into()))?;
    if (r.status == "active" && status != "planned")
        || (r.status == "completed" && status != "active")
    {
        return Err(AppError::Conflict(
            "This sprint transition is not allowed".into(),
        ));
    }
    let (total,done):(f64,f64)=sqlx::query_as("SELECT COALESCE(SUM(c.story_points),0),COALESCE(SUM(CASE WHEN col.type='done' THEN c.story_points ELSE 0 END),0) FROM sprint_cards sc JOIN cards c ON c.id=sc.card_id JOIN columns col ON col.id=c.column_id WHERE sc.sprint_id=? AND c.archived_at IS NULL").bind(sprint).fetch_one(&mut *conn).await?;
    if r.status == "active" {
        let n: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sprints WHERE project_id=? AND status='active'",
        )
        .bind(project)
        .fetch_one(&mut *conn)
        .await?;
        if n > 0 {
            return Err(AppError::Conflict(
                "Complete the active sprint first".into(),
            ));
        }
        sqlx::query("UPDATE sprints SET status='active',start_date=?,end_date=?,goal=COALESCE(?,goal),committed_points=? WHERE id=?").bind(&r.start_date).bind(&r.end_date).bind(&r.goal).bind(total).bind(sprint).execute(&mut *conn).await?;
    } else {
        if let Some(target) = &r.carry_to {
            let n: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM sprints WHERE id=? AND project_id=? AND status='planned'",
            )
            .bind(target)
            .bind(project)
            .fetch_one(&mut *conn)
            .await?;
            if n == 0 {
                return Err(AppError::Validation(
                    "Carryover target must be a planned sprint in this project".into(),
                ));
            }
            sqlx::query("INSERT OR IGNORE INTO sprint_cards(sprint_id,card_id,added_at) SELECT ?,sc.card_id,? FROM sprint_cards sc JOIN cards c ON c.id=sc.card_id JOIN columns col ON col.id=c.column_id WHERE sc.sprint_id=? AND col.type!='done'").bind(target).bind(chrono::Utc::now().to_rfc3339()).bind(sprint).execute(&mut *conn).await?;
        }
        sqlx::query("DELETE FROM sprint_cards WHERE sprint_id=? AND card_id IN (SELECT c.id FROM cards c JOIN columns col ON col.id=c.column_id WHERE col.type!='done')").bind(sprint).execute(&mut *conn).await?;
        sqlx::query("UPDATE sprints SET status='completed',completed_points=? WHERE id=?")
            .bind(done)
            .bind(sprint)
            .execute(&mut *conn)
            .await?;
    }
    sqlx::query("INSERT INTO sprint_snapshots(sprint_id,day,committed_points,remaining_points) VALUES(?,?,?,?) ON CONFLICT(sprint_id,day) DO UPDATE SET remaining_points=excluded.remaining_points").bind(sprint).bind(chrono::Utc::now().date_naive().to_string()).bind(total).bind(total-done).execute(conn).await?;
    Ok(())
}
pub async fn snapshot_all(pool: &SqlitePool) -> Result<(), AppError> {
    sqlx::query("INSERT INTO sprint_snapshots(sprint_id,day,committed_points,remaining_points) SELECT s.id,?,s.committed_points,COALESCE(SUM(CASE WHEN col.type!='done' THEN COALESCE(c.story_points,0) ELSE 0 END),0) FROM sprints s LEFT JOIN sprint_cards sc ON sc.sprint_id=s.id LEFT JOIN cards c ON c.id=sc.card_id AND c.archived_at IS NULL LEFT JOIN columns col ON col.id=c.column_id WHERE s.status='active' GROUP BY s.id ON CONFLICT(sprint_id,day) DO UPDATE SET remaining_points=excluded.remaining_points").bind(chrono::Utc::now().date_naive().to_string()).execute(pool).await?;
    Ok(())
}

pub async fn require_label(pool: &SqlitePool, project: &str, id: &str) -> Result<(), AppError> {
    let n:i64=sqlx::query_scalar("SELECT COUNT(*) FROM labels l JOIN projects p ON p.workspace_id=l.workspace_id WHERE p.id=? AND l.id=?").bind(project).bind(id).fetch_one(pool).await?;
    if n == 0 {
        return Err(AppError::Validation(
            "Label belongs to another workspace".into(),
        ));
    }
    Ok(())
}
pub async fn validate_field(pool: &SqlitePool, project: &str, id: &str) -> Result<(), AppError> {
    let n: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM custom_field_definitions WHERE id=? AND project_id=?",
    )
    .bind(id)
    .bind(project)
    .fetch_one(pool)
    .await?;
    if n == 0 {
        return Err(AppError::Validation(
            "Field belongs to another project".into(),
        ));
    }
    Ok(())
}
pub async fn checklist_context(
    pool: &SqlitePool,
    item: &str,
) -> Result<Option<(String, String, bool)>, AppError> {
    Ok(sqlx::query_as("SELECT c.project_id,c.id,NOT EXISTS(SELECT 1 FROM checklist_items x WHERE x.checklist_id=cl.id AND x.is_done=0) FROM checklist_items i JOIN checklists cl ON cl.id=i.checklist_id JOIN cards c ON c.id=cl.card_id WHERE i.id=?").bind(item).fetch_optional(pool).await?)
}

pub async fn touch_card(pool: &SqlitePool, card: &str) -> Result<(), AppError> {
    sqlx::query("UPDATE cards SET updated_at=? WHERE id=?")
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(card)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn first_response(pool: &SqlitePool, card: &str) -> Result<(), AppError> {
    sqlx::query("UPDATE cards SET first_response_at=COALESCE(first_response_at,?) WHERE id=?")
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(card)
        .execute(pool)
        .await?;
    Ok(())
}
pub async fn sync_resolution(pool: &SqlitePool, card: &str) -> Result<(), AppError> {
    crate::features::productivity::repository::status(pool, card).await?;
    sqlx::query("UPDATE cards SET resolved_at=CASE WHEN EXISTS(SELECT 1 FROM columns WHERE id=cards.column_id AND type='done') THEN COALESCE(resolved_at,?) ELSE NULL END WHERE id=?").bind(chrono::Utc::now().to_rfc3339()).bind(card).execute(pool).await?;
    Ok(())
}
