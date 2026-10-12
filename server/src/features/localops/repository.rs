use crate::error::AppError;
use serde_json::Value;
use sqlx::{SqliteConnection, SqlitePool};
pub async fn rows(
    pool: &SqlitePool,
    sql: &str,
    project: &str,
    user: &str,
    staff: bool,
) -> Result<Value, AppError> {
    let values = sqlx::query_scalar::<_, String>(sql)
        .bind(project)
        .bind(user)
        .bind(staff)
        .fetch_all(pool)
        .await?;
    let mut out = Vec::new();
    for v in values {
        out.push(
            serde_json::from_str::<Value>(&v)
                .map_err(|_| AppError::Internal("Invalid stored record".into()))?,
        );
    }
    Ok(Value::Array(out))
}
pub async fn permissions(
    pool: &SqlitePool,
    project: &str,
    user: &str,
    card: Option<&str>,
) -> Result<Vec<Vec<String>>, AppError> {
    let mut raw=sqlx::query_scalar::<_,String>("SELECT r.permissions FROM custom_role_members m JOIN custom_roles r ON r.id=m.role_id AND r.project_id=m.project_id WHERE m.project_id=? AND m.user_id=?").bind(project).bind(user).fetch_all(pool).await?;
    if let Some(card) = card {
        raw.extend(
            sqlx::query_scalar::<_, String>(
                "SELECT permissions FROM task_permissions WHERE card_id=? AND user_id=?",
            )
            .bind(card)
            .bind(user)
            .fetch_all(pool)
            .await?,
        );
    }
    raw.into_iter()
        .map(|v| {
            serde_json::from_str(&v)
                .map_err(|_| AppError::Internal("Invalid permission rule".into()))
        })
        .collect()
}
pub async fn ticket(
    pool: &SqlitePool,
    project: &str,
    id: &str,
) -> Result<(String, String), AppError> {
    sqlx::query_as("SELECT requester_id,status FROM desk_tickets WHERE project_id=? AND id=?")
        .bind(project)
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Ticket not found".into()))
}
pub async fn plugin(pool: &SqlitePool, project: &str, id: &str) -> Result<String, AppError> {
    sqlx::query_scalar(
        "SELECT manifest FROM local_plugins WHERE project_id=? AND id=? AND enabled=1",
    )
    .bind(project)
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Enabled plugin not found".into()))
}
pub async fn audit(
    conn: &mut SqliteConnection,
    project: &str,
    user: &str,
    kind: &str,
    id: &str,
) -> Result<(), AppError> {
    crate::features::enterprise::repository::audit(
        conn,
        project,
        None,
        Some(user),
        kind,
        serde_json::json!({"id":id}),
    )
    .await
}
pub async fn list(
    pool: &SqlitePool,
    p: &str,
    u: &str,
    staff: bool,
    kind: &str,
) -> Result<Value, AppError> {
    let sql=match kind {
        "agents" => "SELECT json_object('user_id',u.id,'display_name',u.display_name) FROM projects p JOIN workspace_members wm ON wm.workspace_id=p.workspace_id JOIN users u ON u.id=wm.user_id LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=wm.user_id LEFT JOIN custom_role_members crm ON crm.project_id=p.id AND crm.user_id=wm.user_id LEFT JOIN custom_roles cr ON cr.id=crm.role_id WHERE p.id=? AND (? IS NOT NULL) AND ? AND wm.role!='viewer' AND (wm.role IN('owner','admin') OR COALESCE(pm.role,wm.role)!='viewer') AND (p.visibility='public' OR wm.role IN('owner','admin') OR pm.user_id IS NOT NULL) AND (wm.role IN('owner','admin') OR COALESCE(pm.role,wm.role) IN('owner','admin') OR EXISTS(SELECT 1 FROM json_each(cr.permissions) WHERE value='desk_agent'))",
 "roles"=>"SELECT json_object('id',id,'name',name,'permissions',json(permissions)) FROM custom_roles WHERE project_id=? AND (? IS NOT NULL) AND ?",
 "role-members"=>"SELECT json_object('user_id',user_id,'role_id',role_id) FROM custom_role_members WHERE project_id=? AND (? IS NOT NULL) AND ?",
 "task-permissions"=>"SELECT json_object('card_id',c.id,'title',c.title,'user_id',tp.user_id,'permissions',json(tp.permissions)) FROM task_permissions tp JOIN cards c ON c.id=tp.card_id WHERE c.project_id=? AND (? IS NOT NULL) AND ?",
 "tickets"=>"SELECT json_object('id',t.id,'title',t.title,'body',t.description,'status',t.status,'priority',t.priority,'requester_id',t.requester_id,'card_id',t.card_id,'requester_name',u.display_name,'assignee_id',t.assignee_id,'created_at',t.created_at,'response_due_at',t.response_due_at,'resolution_due_at',t.resolution_due_at,'responded_at',t.responded_at,'resolved_at',t.resolved_at) FROM desk_tickets t JOIN users u ON u.id=t.requester_id WHERE t.project_id=? AND (t.requester_id=? OR ?) ORDER BY t.updated_at DESC LIMIT 1000",
 "articles"=>"SELECT json_object('id',id,'title',title,'body',body,'published',published) FROM desk_articles WHERE project_id=? AND (? IS NOT NULL) AND (published=1 OR ?) ORDER BY title LIMIT 500",
 "plugins"=>"SELECT json_object('id',id,'name',name,'version',version,'manifest',json(manifest),'enabled',enabled) FROM local_plugins WHERE project_id=? AND (? IS NOT NULL) AND ?",
 "desk-settings"=>"SELECT json_object('response_hours',response_hours,'resolution_hours',resolution_hours) FROM desk_settings WHERE project_id=? AND (? IS NOT NULL) AND ?",
 _=>return Err(AppError::NotFound("Unknown local resource".into()))};
    rows(pool, sql, p, u, staff).await
}
pub async fn messages(
    pool: &SqlitePool,
    ticket: &str,
    u: &str,
    staff: bool,
) -> Result<Value, AppError> {
    rows(pool,"SELECT json_object('id',m.id,'body',m.body,'internal',m.internal,'created_at',m.created_at,'author',u.display_name) FROM desk_messages m LEFT JOIN users u ON u.id=m.user_id WHERE ticket_id=? AND (? IS NOT NULL) AND (internal=0 OR ?) ORDER BY m.created_at",ticket,u,staff).await
}

pub async fn save(
    conn: &mut SqliteConnection,
    p: &str,
    u: &str,
    k: &str,
    id: &str,
    r: &super::dto::Input,
) -> Result<(), AppError> {
    let now = chrono::Utc::now();
    match k {
        "roles" => {
            sqlx::query("INSERT INTO custom_roles(id,project_id,name,permissions) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,permissions=excluded.permissions WHERE custom_roles.project_id=excluded.project_id").bind(id).bind(p).bind(&r.name).bind(serde_json::to_string(&r.permissions).map_err(|_|AppError::Internal("Permission encoding".into()))?).execute(conn).await?;
        }
        "role-members" => {
            sqlx::query("INSERT INTO custom_role_members(project_id,user_id,role_id) VALUES(?,?,?) ON CONFLICT(project_id,user_id) DO UPDATE SET role_id=excluded.role_id").bind(p).bind(&r.user_id).bind(&r.role_id).execute(conn).await?;
        }
        "task-permissions" => {
            sqlx::query("INSERT INTO task_permissions(card_id,user_id,permissions) VALUES(?,?,?) ON CONFLICT(card_id,user_id) DO UPDATE SET permissions=excluded.permissions").bind(&r.card_id).bind(&r.user_id).bind(serde_json::to_string(&r.permissions).map_err(|_|AppError::Internal("Permission encoding".into()))?).execute(conn).await?;
        }
        "desk-settings" => {
            sqlx::query("INSERT INTO desk_settings(project_id,response_hours,resolution_hours) VALUES(?,?,?) ON CONFLICT(project_id) DO UPDATE SET response_hours=excluded.response_hours,resolution_hours=excluded.resolution_hours").bind(p).bind(r.response_hours.unwrap_or(24)).bind(r.resolution_hours.unwrap_or(72)).execute(conn).await?;
        }
        "articles" => {
            sqlx::query("INSERT INTO desk_articles(id,project_id,title,body,published,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,published=excluded.published,updated_at=excluded.updated_at WHERE desk_articles.project_id=excluded.project_id").bind(id).bind(p).bind(&r.title).bind(&r.body).bind(r.published).bind(now.to_rfc3339()).execute(conn).await?;
        }
        "tickets" => {
            if r.id.is_none() {
                let settings: Option<(i64, i64)> = sqlx::query_as(
                    "SELECT response_hours,resolution_hours FROM desk_settings WHERE project_id=?",
                )
                .bind(p)
                .fetch_optional(&mut *conn)
                .await?;
                let (response, resolution) = settings.unwrap_or((24, 72));
                sqlx::query("INSERT INTO desk_tickets(id,project_id,requester_id,title,description,priority,created_at,updated_at,response_due_at,resolution_due_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id).bind(p).bind(u).bind(&r.title).bind(&r.body).bind(r.priority.as_deref().unwrap_or("medium")).bind(now.to_rfc3339()).bind(now.to_rfc3339()).bind((now+chrono::Duration::hours(response)).to_rfc3339()).bind((now+chrono::Duration::hours(resolution)).to_rfc3339()).execute(conn).await?;
            } else {
                let status = r.status.as_deref().unwrap_or("open");
                sqlx::query("UPDATE desk_tickets SET status=?,priority=COALESCE(?,priority),assignee_id=?,resolved_at=CASE WHEN ? IN('resolved','closed') THEN COALESCE(resolved_at,?) ELSE NULL END,updated_at=? WHERE id=? AND project_id=?").bind(status).bind(&r.priority).bind(&r.assignee_id).bind(status).bind(now.to_rfc3339()).bind(now.to_rfc3339()).bind(id).bind(p).execute(conn).await?;
            }
        }
        "plugins" => {
            let manifest = r
                .manifest
                .as_ref()
                .ok_or_else(|| AppError::Validation("Manifest required".into()))?;
            sqlx::query("INSERT INTO local_plugins(id,project_id,name,version,manifest,enabled,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,version=excluded.version,manifest=excluded.manifest,enabled=excluded.enabled WHERE local_plugins.project_id=excluded.project_id").bind(id).bind(p).bind(manifest["name"].as_str()).bind(manifest["version"].as_str()).bind(manifest.to_string()).bind(r.enabled.unwrap_or(true)).bind(now.to_rfc3339()).execute(&mut *conn).await?;
            let first = &manifest["actions"][0];
            let config = serde_json::json!({"value":first["value"],"steps":manifest["actions"].as_array().map(|a| &a[1..])});
            sqlx::query("INSERT INTO automation_rules(id,project_id,name,trigger_type,trigger_config_json,action_type,action_config_json,is_active,created_at) VALUES(?,?,?,'manual_card','{}',?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,action_type=excluded.action_type,action_config_json=excluded.action_config_json,is_active=excluded.is_active WHERE automation_rules.project_id=excluded.project_id").bind(id).bind(p).bind(manifest["name"].as_str()).bind(first["type"].as_str()).bind(config.to_string()).bind(r.enabled.unwrap_or(true)).bind(now.to_rfc3339()).execute(conn).await?;
        }
        _ => return Err(AppError::NotFound("Unknown local resource".into())),
    }
    Ok(())
}
pub async fn role_exists(pool: &SqlitePool, p: &str, id: &str) -> Result<bool, AppError> {
    Ok(sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM custom_roles WHERE project_id=? AND id=?",
    )
    .bind(p)
    .bind(id)
    .fetch_one(pool)
    .await?
        > 0)
}
pub async fn owned(pool: &SqlitePool, p: &str, k: &str, id: &str) -> Result<bool, AppError> {
    let table = match k {
        "roles" => "custom_roles",
        "articles" => "desk_articles",
        "plugins" => "local_plugins",
        _ => return Err(AppError::Validation("Invalid resource".into())),
    };
    Ok(sqlx::query_scalar::<_, i64>(&format!(
        "SELECT count(*) FROM {table} WHERE project_id=? AND id=?"
    ))
    .bind(p)
    .bind(id)
    .fetch_one(pool)
    .await?
        > 0)
}
pub async fn remove(
    conn: &mut SqliteConnection,
    p: &str,
    k: &str,
    id: &str,
) -> Result<(), AppError> {
    if k == "task-permissions" {
        let (card, user) = id
            .split_once(':')
            .ok_or_else(|| AppError::Validation("Task and member required".into()))?;
        sqlx::query("DELETE FROM task_permissions WHERE card_id=? AND user_id=? AND EXISTS(SELECT 1 FROM cards WHERE id=task_permissions.card_id AND project_id=?)").bind(card).bind(user).bind(p).execute(conn).await?;
        return Ok(());
    }
    let sql = match k {
        "roles" => "DELETE FROM custom_roles WHERE project_id=? AND id=?",
        "role-members" => "DELETE FROM custom_role_members WHERE project_id=? AND user_id=?",
        "articles" => "DELETE FROM desk_articles WHERE project_id=? AND id=?",
        "plugins" => "DELETE FROM local_plugins WHERE project_id=? AND id=?",
        _ => return Err(AppError::Validation("Invalid removable resource".into())),
    };
    sqlx::query(sql)
        .bind(p)
        .bind(id)
        .execute(&mut *conn)
        .await?;
    if k == "plugins" {
        sqlx::query("DELETE FROM automation_rules WHERE project_id=? AND id=?")
            .bind(p)
            .bind(id)
            .execute(conn)
            .await?;
    }
    Ok(())
}
pub async fn message(
    conn: &mut SqliteConnection,
    p: &str,
    t: &str,
    u: &str,
    r: &super::dto::Input,
    staff: bool,
) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("INSERT INTO desk_messages(id,ticket_id,user_id,body,internal,created_at) VALUES(?,?,?,?,?,?)").bind(uuid::Uuid::now_v7().to_string()).bind(t).bind(u).bind(&r.body).bind(r.internal).bind(&now).execute(&mut *conn).await?;
    sqlx::query("UPDATE desk_tickets SET responded_at=CASE WHEN ? AND NOT ? THEN COALESCE(responded_at,?) ELSE responded_at END,updated_at=? WHERE id=? AND project_id=?").bind(staff).bind(r.internal).bind(&now).bind(&now).bind(t).bind(p).execute(conn).await?;
    Ok(())
}

pub async fn convert(
    pool: &SqlitePool,
    p: &str,
    u: &str,
    ticket: &str,
    column: &str,
) -> Result<String, AppError> {
    let mut tx = pool.begin().await?;
    let (title,body,priority,existing):(String,String,String,Option<String>)=sqlx::query_as("SELECT title,description,priority,card_id FROM desk_tickets WHERE id=? AND project_id=?").bind(ticket).bind(p).fetch_one(&mut *tx).await?;
    if let Some(existing) = existing {
        return Ok(existing);
    }
    let card = uuid::Uuid::now_v7().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("INSERT INTO cards(id,project_id,column_id,title,description,priority,position,creator_id,created_at,updated_at) VALUES(?,?,?,?,?,?,1000,?,?,?)").bind(&card).bind(p).bind(column).bind(title).bind(body).bind(priority).bind(u).bind(&now).bind(&now).execute(&mut *tx).await?;
    sqlx::query("UPDATE desk_tickets SET card_id=?,updated_at=? WHERE id=? AND project_id=?")
        .bind(&card)
        .bind(&now)
        .bind(ticket)
        .bind(p)
        .execute(&mut *tx)
        .await?;
    crate::features::productivity::repository::status_connection(&mut tx, &card).await?;
    audit(&mut tx, p, u, "desk_task_created", ticket).await?;
    tx.commit().await?;
    Ok(card)
}
