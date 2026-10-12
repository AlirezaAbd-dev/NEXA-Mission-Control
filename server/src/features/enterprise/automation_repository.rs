use crate::error::AppError;
use serde_json::{json, Value};
use sqlx::{FromRow, SqlitePool};
#[derive(FromRow)]
pub struct Rule {
    pub id: String,
    pub trigger_type: String,
    pub trigger_config_json: String,
    pub action_type: String,
    pub action_config_json: String,
}
pub async fn rules(pool: &SqlitePool, p: &str, event: &str) -> Result<Vec<Rule>, AppError> {
    Ok(sqlx::query_as("SELECT id,trigger_type,trigger_config_json,action_type,action_config_json FROM automation_rules WHERE project_id=? AND trigger_type=? AND is_active=1").bind(p).bind(event).fetch_all(pool).await?)
}
pub async fn rule(pool: &SqlitePool, p: &str, id: &str) -> Result<Option<Rule>, AppError> {
    Ok(sqlx::query_as("SELECT id,trigger_type,trigger_config_json,action_type,action_config_json FROM automation_rules WHERE project_id=? AND id=? AND is_active=1").bind(p).bind(id).fetch_optional(pool).await?)
}
pub async fn card_ids(pool: &SqlitePool, p: &str) -> Result<Vec<String>, AppError> {
    Ok(
        sqlx::query_scalar("SELECT id FROM cards WHERE project_id=? AND archived_at IS NULL")
            .bind(p)
            .fetch_all(pool)
            .await?,
    )
}
pub async fn scheduled_candidates(
    pool: &SqlitePool,
) -> Result<Vec<(String, String, String)>, AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    let mut rows:Vec<(String,String,String)>=sqlx::query_as("SELECT c.project_id,c.id,'due_date_reached' FROM cards c JOIN columns col ON col.id=c.column_id WHERE c.archived_at IS NULL AND c.due_date IS NOT NULL AND substr(c.due_date,1,10)<=substr(?,1,10) AND col.type!='done' UNION SELECT project_id,id,'sla_breached' FROM cards WHERE archived_at IS NULL AND resolved_at IS NULL AND julianday(sla_due_at)<=julianday(?) UNION SELECT project_id,id,'sla_response_breached' FROM cards WHERE archived_at IS NULL AND first_response_at IS NULL AND resolved_at IS NULL AND julianday(sla_response_due_at)<=julianday(?) UNION SELECT c.project_id,c.id,'done_older_than' FROM cards c JOIN columns col ON col.id=c.column_id WHERE c.archived_at IS NULL AND col.type='done'").bind(&now).bind(&now).bind(&now).fetch_all(pool).await?;
    rows.truncate(5000);
    Ok(rows)
}
pub async fn execute(
    pool: &SqlitePool,
    p: &str,
    card: &str,
    r: &Rule,
    event: &str,
    actor: Option<&str>,
) -> Result<(), AppError> {
    if let Some(enabled) = sqlx::query_scalar::<_, i64>(
        "SELECT enabled FROM local_plugins WHERE id=? AND project_id=?",
    )
    .bind(&r.id)
    .bind(p)
    .fetch_optional(pool)
    .await?
    {
        if enabled == 0 {
            return Err(AppError::Forbidden("Plugin is disabled".into()));
        }
        if let Some(user) = actor {
            let role = super::repository::role(pool, p, user).await?;
            if !matches!(role.as_deref(), Some("owner" | "admin")) {
                return Err(AppError::Forbidden(
                    "Only administrators can run plugins".into(),
                ));
            }
        }
    }
    let config: Value = serde_json::from_str(&r.trigger_config_json)
        .map_err(|_| AppError::Validation("Invalid trigger configuration".into()))?;
    let action: Value = serde_json::from_str(&r.action_config_json)
        .map_err(|_| AppError::Validation("Invalid action configuration".into()))?;
    if matches!(event, "manual" | "local_plugin") {
        if let Some(user) = actor {
            let mut kinds = vec![r.action_type.as_str()];
            if let Some(steps) = action.get("steps").and_then(Value::as_array) {
                for step in steps {
                    kinds.push(step["type"].as_str().unwrap_or(""));
                }
            }
            for kind in kinds {
                let capability = match kind {
                    "move_card" => "move",
                    "archive_card" => "archive",
                    _ => "edit",
                };
                crate::features::productivity::policy::enforce_pool(
                    pool,
                    user,
                    p,
                    Some(card),
                    capability,
                )
                .await?;
            }
        }
    }
    let mut tx = pool.begin().await?;
    let row:Option<(String,String,Option<String>,Option<String>,Option<String>)>=sqlx::query_as("SELECT column_id,updated_at,due_date,sla_due_at,sla_response_due_at FROM cards WHERE id=? AND project_id=? AND archived_at IS NULL").bind(card).bind(p).fetch_optional(&mut *tx).await?;
    let Some((column, updated, due, sla, response)) = row else {
        return Ok(());
    };
    if let Some(target) = config.get("column_id").and_then(Value::as_str) {
        if target != column {
            return Ok(());
        }
    }
    if event == "done_older_than" {
        let days = config.get("days").and_then(Value::as_i64).unwrap_or(14);
        if updated >= (chrono::Utc::now() - chrono::Duration::days(days)).to_rfc3339() {
            return Ok(());
        }
    }
    for (field, sql) in [
        (
            "priority",
            "SELECT EXISTS(SELECT 1 FROM cards WHERE id=? AND priority=?)",
        ),
        (
            "assignee_id",
            "SELECT EXISTS(SELECT 1 FROM card_assignees WHERE card_id=? AND user_id=?)",
        ),
        (
            "label_id",
            "SELECT EXISTS(SELECT 1 FROM card_labels WHERE card_id=? AND label_id=?)",
        ),
    ] {
        if let Some(value) = config.get(field).and_then(Value::as_str) {
            let matched: i64 = sqlx::query_scalar(sql)
                .bind(card)
                .bind(value)
                .fetch_one(&mut *tx)
                .await?;
            if matched == 0 {
                return Ok(());
            }
        }
    }
    let key = match event {
        "due_date_reached" => format!("due:{}", due.unwrap_or_default()),
        "sla_response_breached" => format!("response:{}", response.unwrap_or_default()),
        "sla_breached" => format!("sla:{}", sla.unwrap_or_default()),
        "done_older_than" => format!("aging:{updated}"),
        "manual" => uuid::Uuid::now_v7().to_string(),
        _ => format!("{event}:{updated}"),
    };
    let now = chrono::Utc::now().to_rfc3339();
    let inserted=sqlx::query("INSERT OR IGNORE INTO automation_runs(id,rule_id,card_id,event_key,created_at) VALUES(?,?,?,?,?)").bind(uuid::Uuid::now_v7().to_string()).bind(&r.id).bind(card).bind(key).bind(&now).execute(&mut *tx).await?.rows_affected();
    if inserted == 0 {
        return Ok(());
    }
    let before =
        crate::features::activity::audit_repository::task_snapshot_connection(&mut tx, card)
            .await?
            .unwrap_or(Value::Null);
    let mut actions = vec![(
        r.action_type.as_str(),
        action.get("value").and_then(Value::as_str).unwrap_or(""),
    )];
    if let Some(steps) = action.get("steps").and_then(Value::as_array) {
        for step in steps {
            actions.push((
                step.get("type").and_then(Value::as_str).unwrap_or(""),
                step.get("value").and_then(Value::as_str).unwrap_or(""),
            ));
        }
    }
    for (kind, value) in actions {
        super::automation::validate_step(kind, value)?;
        match kind {
            "set_priority" => {
                super::service::validate_priority(value)?;
                sqlx::query("UPDATE cards SET priority=?,updated_at=? WHERE id=?")
                    .bind(value)
                    .bind(&now)
                    .bind(card)
                    .execute(&mut *tx)
                    .await?;
            }
            "archive_card" => {
                sqlx::query("UPDATE cards SET archived_at=?,updated_at=? WHERE id=?")
                    .bind(&now)
                    .bind(&now)
                    .bind(card)
                    .execute(&mut *tx)
                    .await?;
            }
            "mark_checklist_done" => {
                sqlx::query("UPDATE checklist_items SET is_done=1 WHERE checklist_id IN(SELECT id FROM checklists WHERE card_id=?)").bind(card).execute(&mut *tx).await?;
            }
            "assign_user" => {
                let n:i64=sqlx::query_scalar("SELECT COUNT(*) FROM workspace_members wm JOIN projects p ON p.workspace_id=wm.workspace_id WHERE p.id=? AND wm.user_id=? AND (p.visibility!='private' OR wm.role IN('owner','admin') OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=wm.user_id))").bind(p).bind(value).fetch_one(&mut *tx).await?;
                if n == 0 {
                    return Err(AppError::Validation(
                        "Macro assignee is outside this workspace".into(),
                    ));
                }
                sqlx::query("INSERT OR IGNORE INTO card_assignees(card_id,user_id) VALUES(?,?)")
                    .bind(card)
                    .bind(value)
                    .execute(&mut *tx)
                    .await?;
            }
            "add_label" => {
                let n:i64=sqlx::query_scalar("SELECT COUNT(*) FROM labels l JOIN projects p ON p.workspace_id=l.workspace_id WHERE p.id=? AND l.id=?").bind(p).bind(value).fetch_one(&mut *tx).await?;
                if n == 0 {
                    return Err(AppError::Validation(
                        "Macro label is outside this workspace".into(),
                    ));
                }
                sqlx::query("INSERT OR IGNORE INTO card_labels(card_id,label_id) VALUES(?,?)")
                    .bind(card)
                    .bind(value)
                    .execute(&mut *tx)
                    .await?;
            }
            "move_card" => {
                crate::features::productivity::workflow::check_connection(
                    &mut tx, p, card, value, actor,
                )
                .await?;
                let n:i64=sqlx::query_scalar("SELECT COUNT(*) FROM columns c JOIN boards b ON b.id=c.board_id WHERE b.project_id=? AND c.id=?").bind(p).bind(value).fetch_one(&mut *tx).await?;
                if n == 0 {
                    return Err(AppError::Validation(
                        "Macro column is outside this project".into(),
                    ));
                }
                sqlx::query("UPDATE cards SET column_id=?,resolved_at=CASE WHEN EXISTS(SELECT 1 FROM columns WHERE id=? AND type='done') THEN COALESCE(resolved_at,?) ELSE NULL END,updated_at=? WHERE id=?")
                .bind(value)
                .bind(value)
                .bind(&now)
                .bind(&now)
                .bind(card)
                .execute(&mut *tx)
                .await?;
            }
            _ => return Err(AppError::Validation("Unsupported automation action".into())),
        }
    }
    crate::features::productivity::repository::status_connection(&mut tx, card).await?;
    let after =
        crate::features::activity::audit_repository::task_snapshot_connection(&mut tx, card)
            .await?
            .unwrap_or(Value::Null);
    super::repository::audit(
        &mut tx,
        p,
        Some(card),
        actor,
        "automation_executed",
        json!({"rule_id":r.id,"action":r.action_type,"task_title":after.get("title"),"changes":crate::features::activity::audit_repository::changes(&before,&after)}),
    )
    .await?;
    tx.commit().await?;
    Ok(())
}
