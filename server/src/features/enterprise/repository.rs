use super::dto::*;
use crate::error::AppError;
use serde_json::{json, Value};
use sqlx::{Row, SqliteConnection, SqlitePool};

pub async fn role(
    pool: &SqlitePool,
    project: &str,
    user: &str,
) -> Result<Option<String>, AppError> {
    Ok(sqlx::query_scalar("SELECT CASE WHEN wm.role IN ('owner','admin','viewer') THEN wm.role ELSE COALESCE(pm.role,wm.role) END FROM projects p JOIN workspace_members wm ON wm.workspace_id=p.workspace_id LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=wm.user_id WHERE p.id=? AND wm.user_id=? AND (p.visibility='public' OR wm.role IN ('owner','admin') OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=wm.user_id))").bind(project).bind(user).fetch_optional(pool).await?)
}
pub async fn audit(
    conn: &mut SqliteConnection,
    project: &str,
    card: Option<&str>,
    actor: Option<&str>,
    action: &str,
    payload: Value,
) -> Result<(), AppError> {
    sqlx::query("INSERT INTO activities(id,workspace_id,project_id,card_id,actor_id,action,payload,created_at) SELECT ?,workspace_id,id,?,?,?,?,? FROM projects WHERE id=?").bind(uuid::Uuid::now_v7().to_string()).bind(card).bind(actor).bind(action).bind(payload.to_string()).bind(chrono::Utc::now().to_rfc3339()).bind(project).execute(conn).await?;
    Ok(())
}
pub async fn list(
    pool: &SqlitePool,
    project: &str,
    user: &str,
    resource: &str,
) -> Result<Value, AppError> {
    let query=match resource {
 "epics"=>"SELECT e.*,COUNT(c.id) AS total,COALESCE(SUM(CASE WHEN col.type='done' THEN 1 ELSE 0 END),0) AS done FROM epics e LEFT JOIN cards c ON c.epic_id=e.id AND c.archived_at IS NULL LEFT JOIN columns col ON col.id=c.column_id WHERE e.project_id=? GROUP BY e.id ORDER BY e.created_at",
 "releases"=>"SELECT r.*,COUNT(c.id) AS total,COALESCE(SUM(CASE WHEN col.type='done' THEN 1 ELSE 0 END),0) AS done FROM releases r LEFT JOIN cards c ON c.release_id=r.id AND c.archived_at IS NULL LEFT JOIN columns col ON col.id=c.column_id WHERE r.project_id=? GROUP BY r.id ORDER BY r.created_at",
 "rules"=>"SELECT r.*,(SELECT COUNT(*) FROM automation_runs WHERE rule_id=r.id) AS runs FROM automation_rules r WHERE project_id=? AND NOT EXISTS(SELECT 1 FROM local_plugins lp WHERE lp.id=r.id) ORDER BY created_at",
 "views"=>"SELECT * FROM saved_views WHERE project_id=? AND user_id=? ORDER BY created_at",
 "documents"=>"SELECT * FROM document_links WHERE project_id=? ORDER BY created_at",
 "integrations"=>"SELECT id,project_id,kind,name,created_at FROM project_integrations WHERE project_id=? ORDER BY created_at",
 "links"=>"SELECT l.*,c.title AS target_card_title FROM card_links l JOIN cards c ON c.id=l.target_card_id JOIN cards s ON s.id=l.source_card_id WHERE s.project_id=? AND c.project_id=s.project_id",
 "audit"=>"SELECT a.*,u.display_name AS actor_name FROM activities a LEFT JOIN users u ON u.id=a.actor_id WHERE project_id=? ORDER BY created_at DESC LIMIT 500",
 "snapshots"=>"SELECT ss.*,s.name,s.status,s.start_date,s.end_date,s.committed_points AS committed,s.completed_points AS completed FROM sprints s LEFT JOIN sprint_snapshots ss ON ss.sprint_id=s.id WHERE s.project_id=? ORDER BY s.created_at,ss.day",
 "related-cards"=>"SELECT c.id,c.title,c.project_id,p.name AS project_name FROM cards c JOIN projects p ON p.id=c.project_id JOIN workspace_members wm ON wm.workspace_id=p.workspace_id WHERE p.workspace_id=(SELECT workspace_id FROM projects WHERE id=?) AND wm.user_id=? AND c.archived_at IS NULL AND (p.visibility='public' OR wm.role IN ('owner','admin') OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=wm.user_id)) ORDER BY p.name,c.title LIMIT 1000",
 "starred"=>"SELECT p.id,p.name FROM board_preferences pref JOIN projects p ON p.id=pref.project_id JOIN workspace_members wm ON wm.workspace_id=p.workspace_id AND wm.user_id=pref.user_id WHERE p.workspace_id=(SELECT workspace_id FROM projects WHERE id=?) AND pref.user_id=? AND json_extract(pref.config_json,'$.starred')=1 AND p.archived_at IS NULL AND (p.visibility='public' OR wm.role IN ('owner','admin') OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=wm.user_id))",
 "metadata"=>"SELECT id,epic_id,parent_id,release_id,sla_due_at,sla_response_due_at,first_response_at,resolved_at FROM cards WHERE project_id=?",
 _=>return Err(AppError::NotFound("Unknown resource".into()))};
    let mut q = sqlx::query(query).bind(project);
    if resource == "views" || matches!(resource, "related-cards" | "starred") {
        q = q.bind(user);
    }
    let rows = q.fetch_all(pool).await?;
    Ok(rows_json(rows))
}
pub async fn export_rows(pool: &SqlitePool, query: &str, project: &str) -> Result<Value, AppError> {
    Ok(rows_json(
        sqlx::query(query).bind(project).fetch_all(pool).await?,
    ))
}
fn rows_json(rows: Vec<sqlx::sqlite::SqliteRow>) -> Value {
    Value::Array(
        rows.into_iter()
            .map(|r| {
                let mut v = serde_json::Map::new();
                use sqlx::{Column, TypeInfo, ValueRef};
                for c in r.columns() {
                    let name = c.name();
                    let raw = r.try_get_raw(name);
                    let value = match raw {
                        Ok(raw) if raw.is_null() => Value::Null,
                        Ok(raw) if raw.type_info().name() == "INTEGER" => {
                            json!(r.try_get::<i64, _>(name).unwrap_or(0))
                        }
                        Ok(raw) if raw.type_info().name() == "REAL" => {
                            json!(r.try_get::<f64, _>(name).unwrap_or(0.0))
                        }
                        _ => json!(r.try_get::<String, _>(name).unwrap_or_default()),
                    };
                    v.insert(name.into(), value);
                }
                Value::Object(v)
            })
            .collect(),
    )
}
pub fn table(resource: &str) -> Result<&'static str, AppError> {
    match resource {
        "epics" => Ok("epics"),
        "releases" => Ok("releases"),
        "rules" => Ok("automation_rules"),
        "views" => Ok("saved_views"),
        "documents" => Ok("document_links"),
        "integrations" => Ok("project_integrations"),
        _ => Err(AppError::NotFound("Unknown resource".into())),
    }
}
pub async fn save(
    conn: &mut SqliteConnection,
    project: &str,
    user: &str,
    resource: &str,
    id: &str,
    r: &ResourceRequest,
) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    match resource {
        "epics" => {
            sqlx::query("INSERT INTO epics(id,project_id,name,summary,color,status,start_date,target_date,created_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,summary=excluded.summary,color=excluded.color,status=excluded.status,start_date=excluded.start_date,target_date=excluded.target_date").bind(id).bind(project).bind(&r.name).bind(&r.summary).bind(&r.color).bind(if r.status.is_empty(){"planned"}else{&r.status}).bind(&r.start_date).bind(&r.target_date).bind(now).execute(conn).await?;
        }
        "releases" => {
            sqlx::query("INSERT INTO releases(id,project_id,name,description,status,target_date,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,status=excluded.status,target_date=excluded.target_date").bind(id).bind(project).bind(&r.name).bind(&r.summary).bind(if r.status.is_empty(){"unreleased"}else{&r.status}).bind(&r.target_date).bind(now).execute(conn).await?;
        }
        "rules" => {
            sqlx::query("INSERT INTO automation_rules(id,project_id,name,trigger_type,trigger_config_json,action_type,action_config_json,is_active,created_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,trigger_type=excluded.trigger_type,trigger_config_json=excluded.trigger_config_json,action_type=excluded.action_type,action_config_json=excluded.action_config_json,is_active=excluded.is_active").bind(id).bind(project).bind(&r.name).bind(&r.trigger_type).bind(r.trigger_config.to_string()).bind(&r.action_type).bind(r.action_config.to_string()).bind(r.is_active).bind(now).execute(conn).await?;
        }
        "views" => {
            sqlx::query("INSERT INTO saved_views(id,project_id,user_id,name,config_json,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,config_json=excluded.config_json").bind(id).bind(project).bind(user).bind(&r.name).bind(r.config.to_string()).bind(now).execute(conn).await?;
        }
        "documents" => {
            sqlx::query("INSERT INTO document_links(id,project_id,card_id,name,kind,url,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,kind=excluded.kind,url=excluded.url,card_id=excluded.card_id").bind(id).bind(project).bind(&r.card_id).bind(&r.name).bind(r.kind.as_deref().unwrap_or("document")).bind(&r.url).bind(now).execute(conn).await?;
        }
        "integrations" => {
            sqlx::query("INSERT INTO project_integrations(id,project_id,kind,name,config_json,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,kind=excluded.kind,config_json=excluded.config_json").bind(id).bind(project).bind(&r.kind).bind(&r.name).bind(r.config.to_string()).bind(now).execute(conn).await?;
        }
        _ => return Err(AppError::NotFound("Unknown resource".into())),
    }
    Ok(())
}
pub async fn owned(
    conn: &mut SqliteConnection,
    project: &str,
    user: &str,
    resource: &str,
    id: &str,
) -> Result<bool, AppError> {
    let table = table(resource)?;
    let query = format!(
        "SELECT COUNT(*) FROM {table} WHERE id=? AND project_id=?{}",
        if resource == "views" {
            " AND user_id=?"
        } else {
            ""
        }
    );
    let mut q = sqlx::query_scalar::<_, i64>(&query).bind(id).bind(project);
    if resource == "views" || matches!(resource, "related-cards" | "starred") {
        q = q.bind(user);
    }
    Ok(q.fetch_one(conn).await? > 0)
}
pub async fn remove(conn: &mut SqliteConnection, resource: &str, id: &str) -> Result<(), AppError> {
    sqlx::query(&format!("DELETE FROM {} WHERE id=?", table(resource)?))
        .bind(id)
        .execute(conn)
        .await?;
    Ok(())
}

pub async fn workspace_metrics(
    pool: &SqlitePool,
    workspace: &str,
    user: &str,
) -> Result<Value, AppError> {
    let(projects,tasks,pending,urgent,overdue):(i64,i64,i64,i64,i64)=sqlx::query_as("SELECT COUNT(DISTINCT p.id),COUNT(c.id),COALESCE(SUM(CASE WHEN c.id IS NOT NULL AND col.type!='done' THEN 1 ELSE 0 END),0),COALESCE(SUM(CASE WHEN c.priority='urgent' AND col.type!='done' THEN 1 ELSE 0 END),0),COALESCE(SUM(CASE WHEN substr(c.due_date,1,10)<date('now') AND col.type!='done' THEN 1 ELSE 0 END),0) FROM projects p JOIN workspace_members wm ON wm.workspace_id=p.workspace_id LEFT JOIN cards c ON c.project_id=p.id AND c.archived_at IS NULL LEFT JOIN columns col ON col.id=c.column_id WHERE p.workspace_id=? AND wm.user_id=? AND p.archived_at IS NULL AND (p.visibility='public' OR wm.role IN ('owner','admin') OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=wm.user_id))").bind(workspace).bind(user).fetch_one(pool).await?;
    Ok(
        json!({"projects":projects,"tasks":tasks,"pending":pending,"urgent":urgent,"overdue":overdue}),
    )
}
