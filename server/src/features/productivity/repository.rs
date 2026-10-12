use super::dto::*;
use crate::error::AppError;
use serde_json::{json, Value};
use sqlx::{SqliteConnection, SqlitePool};
pub async fn personal(pool: &SqlitePool, user: &str, kind: &str) -> Result<Value, AppError> {
    Ok(match kind{
 "inbox"=>json!(sqlx::query_as::<_,Inbox>("SELECT id,title,description,done,created_at FROM inbox_items WHERE user_id=? ORDER BY done,created_at DESC").bind(user).fetch_all(pool).await?),
 "planner"=>json!(sqlx::query_as::<_,Slot>("SELECT id,card_id,title,start_at,end_at FROM planner_slots WHERE user_id=? ORDER BY start_at").bind(user).fetch_all(pool).await?),
 _=>return Err(AppError::NotFound("Personal resource not found".into()))})
}
pub async fn work(
    pool: &SqlitePool,
    user: &str,
    workspace: &str,
) -> Result<Vec<WorkCard>, AppError> {
    Ok(sqlx::query_as("SELECT c.id,c.project_id,p.name AS project_name,c.column_id,col.name AS status,col.type AS status_type,c.title,c.priority,c.due_date,c.start_date,c.estimated_hours,c.story_points,t.name AS work_type,COALESCE((SELECT group_concat(u.display_name,', ') FROM card_assignees a JOIN users u ON u.id=a.user_id WHERE a.card_id=c.id),'') AS assignees,COALESCE((SELECT group_concat(a.user_id) FROM card_assignees a WHERE a.card_id=c.id),'') AS assignee_ids FROM cards c JOIN projects p ON p.id=c.project_id JOIN columns col ON col.id=c.column_id JOIN workspace_members wm ON wm.workspace_id=p.workspace_id AND wm.user_id=? LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=wm.user_id LEFT JOIN card_productivity cp ON cp.card_id=c.id LEFT JOIN project_work_types t ON t.id=cp.work_type_id WHERE p.workspace_id=? AND c.archived_at IS NULL AND (p.visibility!='private' OR wm.role IN('owner','admin') OR pm.user_id IS NOT NULL) ORDER BY c.updated_at DESC LIMIT 5000").bind(user).bind(workspace).fetch_all(pool).await?)
}
pub async fn resources(pool: &SqlitePool, p: &str, kind: &str) -> Result<Value, AppError> {
    let(q,key)=match kind{
 "types"=>("SELECT json_object('id',id,'name',name,'color',color) FROM project_work_types WHERE project_id=?","types"),
 "workflows"=>("SELECT json_object('id',id,'name',name,'from_column',from_column,'to_column',to_column,'require_description',require_description,'require_checklists',require_checklists,'require_approval',require_approval,'allowed_role',allowed_role) FROM workflow_transitions WHERE project_id=?","workflows"),
 "forms"=>("SELECT json_object('id',id,'name',name,'column_id',column_id,'require_description',require_description) FROM intake_forms WHERE project_id=?","forms"),
 "settings"=>("SELECT json_object('card_id',cp.card_id,'work_type_id',cp.work_type_id,'repeat_days',cp.repeat_days,'reminder_minutes',cp.reminder_minutes) FROM card_productivity cp JOIN cards c ON c.id=cp.card_id WHERE c.project_id=?","settings"),
 "approvals"=>("SELECT json_object('id',a.id,'card_id',a.card_id,'transition_id',a.transition_id,'requested_by',a.requested_by,'approved_by',a.approved_by,'revision',a.revision) FROM card_approvals a JOIN cards c ON c.id=a.card_id WHERE c.project_id=? ORDER BY a.requested_at DESC","approvals"),
 _=>return Err(AppError::NotFound("Project resource not found".into()))};
    let _ = key;
    let rows: Vec<String> = sqlx::query_scalar(q).bind(p).fetch_all(pool).await?;
    Ok(Value::Array(
        rows.into_iter()
            .map(|r| serde_json::from_str(&r).unwrap_or(Value::Null))
            .collect(),
    ))
}
pub async fn rules(conn: &mut SqliteConnection, p: &str) -> Result<Vec<Rule>, AppError> {
    Ok(sqlx::query_as("SELECT id,from_column,to_column,require_description,require_checklists,require_approval,allowed_role FROM workflow_transitions WHERE project_id=?").bind(p).fetch_all(conn).await?)
}
pub async fn move_facts(
    conn: &mut SqliteConnection,
    p: &str,
    c: &str,
) -> Result<(String, Option<String>, String), AppError> {
    Ok(sqlx::query_as(
        "SELECT column_id,description,updated_at FROM cards WHERE id=? AND project_id=?",
    )
    .bind(c)
    .bind(p)
    .fetch_one(conn)
    .await?)
}
pub async fn unfinished(conn: &mut SqliteConnection, c: &str) -> Result<i64, AppError> {
    Ok(sqlx::query_scalar("SELECT count(*) FROM checklist_items i JOIN checklists cl ON cl.id=i.checklist_id WHERE cl.card_id=? AND i.is_done=0").bind(c).fetch_one(conn).await?)
}
pub async fn transition_role(
    conn: &mut SqliteConnection,
    p: &str,
    u: &str,
) -> Result<Option<String>, AppError> {
    Ok(sqlx::query_scalar("SELECT wm.role FROM workspace_members wm JOIN projects p ON p.workspace_id=wm.workspace_id WHERE p.id=? AND wm.user_id=?").bind(p).bind(u).fetch_optional(conn).await?)
}
pub async fn approved(
    conn: &mut SqliteConnection,
    c: &str,
    t: &str,
    revision: &str,
) -> Result<bool, AppError> {
    Ok(sqlx::query_scalar::<_,i64>("SELECT count(*) FROM card_approvals WHERE card_id=? AND transition_id=? AND revision=? AND approved_at IS NOT NULL").bind(c).bind(t).bind(revision).fetch_one(conn).await?>0)
}
pub async fn status(pool: &SqlitePool, card: &str) -> Result<(), AppError> {
    sqlx::query("INSERT INTO card_status_history(id,card_id,project_id,column_id,entered_at) SELECT ?,id,project_id,column_id,? FROM cards c WHERE id=? AND (NOT EXISTS(SELECT 1 FROM card_status_history WHERE card_id=c.id) OR c.column_id!=(SELECT column_id FROM card_status_history WHERE card_id=c.id ORDER BY entered_at DESC LIMIT 1))").bind(uuid::Uuid::now_v7().to_string()).bind(chrono::Utc::now().to_rfc3339()).bind(card).execute(pool).await?;
    Ok(())
}
pub async fn status_connection(
    conn: &mut sqlx::SqliteConnection,
    card: &str,
) -> Result<(), AppError> {
    sqlx::query("INSERT INTO card_status_history(id,card_id,project_id,column_id,entered_at) SELECT ?,id,project_id,column_id,? FROM cards c WHERE id=? AND (NOT EXISTS(SELECT 1 FROM card_status_history WHERE card_id=c.id) OR c.column_id!=(SELECT column_id FROM card_status_history WHERE card_id=c.id ORDER BY entered_at DESC LIMIT 1))").bind(uuid::Uuid::now_v7().to_string()).bind(chrono::Utc::now().to_rfc3339()).bind(card).execute(conn).await?;
    Ok(())
}
pub async fn save_personal(
    pool: &SqlitePool,
    u: &str,
    kind: &str,
    id: Option<&str>,
    r: &Input,
) -> Result<Value, AppError> {
    let new = uuid::Uuid::now_v7().to_string();
    let id = id.unwrap_or(&new);
    let now = chrono::Utc::now().to_rfc3339();
    let result=match(kind,r.start_at.as_deref(),r.end_at.as_deref()){
 ("inbox",_,_)=>sqlx::query("INSERT INTO inbox_items(id,user_id,title,description,done,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,done=excluded.done WHERE user_id=excluded.user_id").bind(id).bind(u).bind(&r.title).bind(&r.description).bind(r.done.unwrap_or(false)).bind(now).execute(pool).await?,
 ("planner",Some(start),Some(end))=>sqlx::query("INSERT INTO planner_slots(id,user_id,card_id,title,start_at,end_at,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET card_id=excluded.card_id,title=excluded.title,start_at=excluded.start_at,end_at=excluded.end_at WHERE user_id=excluded.user_id").bind(id).bind(u).bind(&r.card_id).bind(&r.title).bind(start).bind(end).bind(now).execute(pool).await?,
 _=>return Err(AppError::Validation("Unknown personal resource or missing dates".into()))};
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Item not found".into()));
    }
    Ok(json!({"id":id}))
}
pub async fn delete_personal(
    pool: &SqlitePool,
    u: &str,
    kind: &str,
    id: &str,
) -> Result<(), AppError> {
    let q = match kind {
        "inbox" => "DELETE FROM inbox_items WHERE id=? AND user_id=?",
        "planner" => "DELETE FROM planner_slots WHERE id=? AND user_id=?",
        _ => return Err(AppError::NotFound("Item not found".into())),
    };
    if sqlx::query(q)
        .bind(id)
        .bind(u)
        .execute(pool)
        .await?
        .rows_affected()
        == 0
    {
        return Err(AppError::NotFound("Item not found".into()));
    }
    Ok(())
}
pub async fn convert(
    pool: &SqlitePool,
    u: &str,
    id: &str,
    p: &str,
    column: &str,
) -> Result<String, AppError> {
    let mut tx = pool.begin().await?;
    let item: Option<(String, String)> = sqlx::query_as(
        "DELETE FROM inbox_items WHERE id=? AND user_id=? RETURNING title,description",
    )
    .bind(id)
    .bind(u)
    .fetch_optional(&mut *tx)
    .await?;
    let (title, description) =
        item.ok_or_else(|| AppError::NotFound("Inbox item not found".into()))?;
    let card = uuid::Uuid::now_v7().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("INSERT INTO cards(id,project_id,column_id,title,description,priority,position,creator_id,created_at,updated_at) VALUES(?,?,?,?,?,'no_priority',1000,?,?,?)").bind(&card).bind(p).bind(column).bind(title).bind(description).bind(u).bind(&now).bind(&now).execute(&mut *tx).await?;
    crate::features::enterprise::repository::audit(
        &mut tx,
        p,
        Some(&card),
        Some(u),
        "inbox_converted",
        json!({}),
    )
    .await?;
    tx.commit().await?;
    Ok(card)
}
pub async fn save_resource(
    pool: &SqlitePool,
    p: &str,
    kind: &str,
    r: &Input,
    token_hash: Option<&str>,
) -> Result<String, AppError> {
    let id = uuid::Uuid::now_v7().to_string();
    match kind {
        "types" => {
            sqlx::query("INSERT INTO project_work_types(id,project_id,name,color) VALUES(?,?,?,?)")
                .bind(&id)
                .bind(p)
                .bind(&r.name)
                .bind(if r.color.is_empty() {
                    "#0d9488"
                } else {
                    &r.color
                })
                .execute(pool)
                .await?;
        }
        "workflows" => {
            sqlx::query("INSERT INTO workflow_transitions(id,project_id,name,from_column,to_column,require_description,require_checklists,require_approval,allowed_role) VALUES(?,?,?,?,?,?,?,?,?)").bind(&id).bind(p).bind(&r.name).bind(&r.from_column).bind(&r.to_column).bind(r.require_description).bind(r.require_checklists).bind(r.require_approval).bind(if r.allowed_role.is_empty(){"member"}else{&r.allowed_role}).execute(pool).await?;
        }
        "forms" => {
            sqlx::query("INSERT INTO intake_forms(id,project_id,column_id,name,token_hash,require_description,created_at) VALUES(?,?,?,?,?,?,?)").bind(&id).bind(p).bind(&r.column_id).bind(&r.name).bind(token_hash).bind(r.require_description).bind(chrono::Utc::now().to_rfc3339()).execute(pool).await?;
        }
        _ => return Err(AppError::NotFound("Resource not found".into())),
    };
    Ok(id)
}
pub async fn delete_resource(
    pool: &SqlitePool,
    p: &str,
    kind: &str,
    id: &str,
) -> Result<(), AppError> {
    let q = match kind {
        "members" => "DELETE FROM project_members WHERE user_id=? AND project_id=?",
        "templates" => "DELETE FROM board_templates WHERE id=? AND workspace_id=(SELECT workspace_id FROM projects WHERE id=?)",
        "mirrors" => "DELETE FROM board_mirrors WHERE id=? AND project_id=?",
        "types" => "DELETE FROM project_work_types WHERE id=? AND project_id=?",
        "workflows" => "DELETE FROM workflow_transitions WHERE id=? AND project_id=?",
        "forms" => "DELETE FROM intake_forms WHERE id=? AND project_id=?",
        _ => return Err(AppError::NotFound("Resource not found".into())),
    };
    sqlx::query(q).bind(id).bind(p).execute(pool).await?;
    Ok(())
}
pub async fn settings(pool: &SqlitePool, c: &str, r: &Input) -> Result<(), AppError> {
    sqlx::query("INSERT INTO card_productivity(card_id,work_type_id,repeat_days,reminder_minutes) VALUES(?,?,?,?) ON CONFLICT(card_id) DO UPDATE SET work_type_id=excluded.work_type_id,repeat_days=excluded.repeat_days,reminder_minutes=excluded.reminder_minutes,reminded_for=NULL").bind(c).bind(&r.work_type_id).bind(r.repeat_days).bind(r.reminder_minutes).execute(pool).await?;
    Ok(())
}
pub async fn type_in_project(pool: &SqlitePool, p: &str, id: &str) -> Result<bool, AppError> {
    Ok(sqlx::query_scalar::<_, i64>(
        "SELECT count(*) FROM project_work_types WHERE id=? AND project_id=?",
    )
    .bind(id)
    .bind(p)
    .fetch_one(pool)
    .await?
        == 1)
}
pub async fn templates(pool: &SqlitePool, p: &str) -> Result<Value, AppError> {
    let rows:Vec<(String,String)>=sqlx::query_as("SELECT id,name FROM board_templates WHERE workspace_id=(SELECT workspace_id FROM projects WHERE id=?) ORDER BY created_at DESC").bind(p).fetch_all(pool).await?;
    Ok(json!(rows
        .into_iter()
        .map(|(id, name)| json!({"id":id,"name":name}))
        .collect::<Vec<_>>()))
}
pub async fn mirrors(pool: &SqlitePool, p: &str, u: &str) -> Result<Value, AppError> {
    let rows=sqlx::query_scalar::<_,String>("SELECT json_object('id',m.id,'card_id',c.id,'title',c.title,'project_name',sp.name,'status',col.name,'priority',c.priority) FROM board_mirrors m JOIN cards c ON c.id=m.card_id JOIN projects sp ON sp.id=c.project_id JOIN columns col ON col.id=c.column_id JOIN workspace_members wm ON wm.workspace_id=sp.workspace_id AND wm.user_id=? LEFT JOIN project_members pm ON pm.project_id=sp.id AND pm.user_id=wm.user_id WHERE m.project_id=? AND c.archived_at IS NULL AND (sp.visibility!='private' OR wm.role IN('owner','admin') OR pm.user_id IS NOT NULL)").bind(u).bind(p).fetch_all(pool).await?;
    Ok(Value::Array(
        rows.into_iter()
            .map(|r| serde_json::from_str(&r).unwrap_or(Value::Null))
            .collect(),
    ))
}
pub async fn mirror(pool: &SqlitePool, p: &str, c: &str) -> Result<String, AppError> {
    let id = uuid::Uuid::now_v7().to_string();
    sqlx::query("INSERT INTO board_mirrors(id,project_id,card_id,created_at) VALUES(?,?,?,?) ON CONFLICT(project_id,card_id) DO NOTHING").bind(&id).bind(p).bind(c).bind(chrono::Utc::now().to_rfc3339()).execute(pool).await?;
    Ok(id)
}
pub async fn save_template(pool: &SqlitePool, p: &str, name: &str) -> Result<String, AppError> {
    let cards=crate::features::enterprise::repository::export_rows(pool,"SELECT title,description,priority,column_id,story_points FROM cards WHERE project_id=? AND archived_at IS NULL",p).await?;
    let columns=crate::features::enterprise::repository::export_rows(pool,"SELECT col.id,col.name FROM columns col JOIN boards b ON b.id=col.board_id WHERE b.project_id=? ORDER BY col.position",p).await?;
    let id = uuid::Uuid::now_v7().to_string();
    sqlx::query("INSERT INTO board_templates(id,workspace_id,name,data_json,created_at) SELECT ?,workspace_id,?,?,? FROM projects WHERE id=?").bind(&id).bind(name).bind(json!({"cards":cards,"columns":columns}).to_string()).bind(chrono::Utc::now().to_rfc3339()).bind(p).execute(pool).await?;
    Ok(id)
}
pub async fn template(pool: &SqlitePool, p: &str, id: &str) -> Result<Value, AppError> {
    let data:Option<String>=sqlx::query_scalar("SELECT data_json FROM board_templates WHERE id=? AND workspace_id=(SELECT workspace_id FROM projects WHERE id=?)").bind(id).bind(p).fetch_optional(pool).await?;
    serde_json::from_str(
        &data.ok_or_else(|| AppError::NotFound("Template not found in this workspace".into()))?,
    )
    .map_err(|_| AppError::Internal("Template data is invalid".into()))
}
pub async fn reports(pool: &SqlitePool, p: &str) -> Result<Value, AppError> {
    let cycles=crate::features::enterprise::repository::export_rows(pool,"SELECT c.id,c.title,c.resolved_at,MAX(0,(julianday(c.resolved_at)-julianday(COALESCE((SELECT MIN(h.entered_at) FROM card_status_history h JOIN columns col ON col.id=h.column_id WHERE h.card_id=c.id AND col.type='active'),c.created_at)))*24) AS hours FROM cards c WHERE c.project_id=? AND c.resolved_at IS NOT NULL AND c.archived_at IS NULL ORDER BY c.resolved_at DESC LIMIT 300",p).await?;
    let flow=crate::features::enterprise::repository::export_rows(pool,"WITH RECURSIVE days(day) AS (SELECT date('now','-29 days') UNION ALL SELECT date(day,'+1 day') FROM days WHERE day<date('now')) SELECT day,col.name AS status,col.type AS status_type,COUNT(c.id) AS count FROM days CROSS JOIN columns col JOIN boards b ON b.id=col.board_id LEFT JOIN cards c ON c.project_id=b.project_id AND c.archived_at IS NULL AND c.created_at<datetime(day,'+1 day') AND col.id=(SELECT h.column_id FROM card_status_history h WHERE h.card_id=c.id AND h.entered_at<strftime('%Y-%m-%dT00:00:00',day,'+1 day') ORDER BY h.entered_at DESC LIMIT 1) WHERE b.project_id=? GROUP BY day,col.id ORDER BY day,col.position",p).await?;
    Ok(json!({"cycles":cycles,"flow":flow}))
}
pub async fn approval(
    pool: &SqlitePool,
    u: &str,
    c: &str,
    transition: &str,
) -> Result<String, AppError> {
    let id = uuid::Uuid::now_v7().to_string();
    sqlx::query("INSERT OR IGNORE INTO card_approvals(id,card_id,transition_id,requested_by,requested_at,revision) SELECT ?,id,?,?,?,updated_at FROM cards WHERE id=?").bind(&id).bind(transition).bind(u).bind(chrono::Utc::now().to_rfc3339()).bind(c).execute(pool).await?;
    Ok(id)
}
pub async fn approve(pool: &SqlitePool, p: &str, u: &str, id: &str) -> Result<(), AppError> {
    if sqlx::query("UPDATE card_approvals SET approved_by=?,approved_at=? WHERE id=? AND requested_by!=? AND approved_at IS NULL AND card_id IN(SELECT id FROM cards WHERE project_id=?)").bind(u).bind(chrono::Utc::now().to_rfc3339()).bind(id).bind(u).bind(p).execute(pool).await?.rows_affected()==0{return Err(AppError::Validation("Approval not found, already approved, or self-approval is forbidden".into()));}
    Ok(())
}
#[derive(sqlx::FromRow)]
pub struct Form {
    pub id: String,
    pub project_id: String,
    pub column_id: String,
    pub name: String,
    pub require_description: i64,
}
pub async fn form(pool: &SqlitePool, hash: &str) -> Result<Form, AppError> {
    sqlx::query_as("SELECT id,project_id,column_id,name,require_description FROM intake_forms WHERE token_hash=?").bind(hash).fetch_optional(pool).await?.ok_or_else(||AppError::NotFound("Form not found".into()))
}
pub async fn submit(pool: &SqlitePool, f: &Form, r: &Input) -> Result<String, AppError> {
    let id = uuid::Uuid::now_v7().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let mut tx = pool.begin().await?;
    let recent:i64=sqlx::query_scalar("SELECT COUNT(*) FROM activities WHERE project_id=? AND action='form_submitted' AND json_extract(payload,'$.form_id')=? AND created_at>=?").bind(&f.project_id).bind(&f.id).bind((chrono::Utc::now()-chrono::Duration::minutes(1)).to_rfc3339()).fetch_one(&mut *tx).await?;
    if recent >= 20 {
        return Err(AppError::Validation(
            "This form is receiving too many requests. Try again in a minute".into(),
        ));
    }
    sqlx::query("INSERT INTO cards(id,project_id,column_id,title,description,priority,position,created_at,updated_at) VALUES(?,?,?,?,?,'no_priority',1000,?,?)").bind(&id).bind(&f.project_id).bind(&f.column_id).bind(&r.title).bind(&r.description).bind(&now).bind(&now).execute(&mut *tx).await?;
    crate::features::enterprise::repository::audit(
        &mut tx,
        &f.project_id,
        Some(&id),
        None,
        "form_submitted",
        json!({"form_id":f.id}),
    )
    .await?;
    tx.commit().await?;
    Ok(id)
}
pub async fn repeat_and_remind(pool: &SqlitePool) -> Result<Vec<String>, AppError> {
    let mut tx = pool.begin().await?;
    let now = chrono::Utc::now().to_rfc3339();
    let mut projects = Vec::new();
    let repeat:Vec<(String,String,i64,String)>=sqlx::query_as("SELECT c.id,c.project_id,cp.repeat_days,COALESCE(c.resolved_at,c.updated_at) FROM cards c JOIN card_productivity cp ON cp.card_id=c.id JOIN columns col ON col.id=c.column_id WHERE c.archived_at IS NULL AND col.type='done' AND cp.repeat_days IS NOT NULL AND (cp.last_occurrence IS NULL OR cp.last_occurrence!=COALESCE(c.resolved_at,c.updated_at))").fetch_all(&mut *tx).await?;
    for (card, p, days, revision) in repeat {
        let next = uuid::Uuid::now_v7().to_string();
        let due = (chrono::Utc::now() + chrono::Duration::days(days))
            .format("%Y-%m-%d")
            .to_string();
        let column:Option<String>=sqlx::query_scalar("SELECT col.id FROM columns col JOIN boards b ON b.id=col.board_id WHERE b.project_id=? AND col.type!='done' ORDER BY col.position LIMIT 1").bind(&p).fetch_optional(&mut *tx).await?;
        let Some(column) = column else { continue };
        sqlx::query("INSERT INTO cards(id,project_id,column_id,title,description,priority,position,creator_id,due_date,estimated_hours,story_points,epic_id,release_id,created_at,updated_at) SELECT ?,project_id,?,title,description,priority,position,creator_id,?,estimated_hours,story_points,epic_id,release_id,?,? FROM cards WHERE id=?").bind(&next).bind(column).bind(due).bind(&now).bind(&now).bind(&card).execute(&mut *tx).await?;
        sqlx::query("INSERT INTO card_productivity(card_id,work_type_id,repeat_days,reminder_minutes) SELECT ?,work_type_id,repeat_days,reminder_minutes FROM card_productivity WHERE card_id=?").bind(&next).bind(&card).execute(&mut *tx).await?;
        sqlx::query("INSERT INTO card_assignees(card_id,user_id) SELECT ?,user_id FROM card_assignees WHERE card_id=?").bind(&next).bind(&card).execute(&mut *tx).await?;
        sqlx::query("INSERT INTO card_labels(card_id,label_id) SELECT ?,label_id FROM card_labels WHERE card_id=?").bind(&next).bind(&card).execute(&mut *tx).await?;
        let lists: Vec<(String, String, f64)> =
            sqlx::query_as("SELECT id,title,position FROM checklists WHERE card_id=?")
                .bind(&card)
                .fetch_all(&mut *tx)
                .await?;
        for (source, title, position) in lists {
            let list = uuid::Uuid::now_v7().to_string();
            sqlx::query(
                "INSERT INTO checklists(id,card_id,title,position,created_at) VALUES(?,?,?,?,?)",
            )
            .bind(&list)
            .bind(&next)
            .bind(title)
            .bind(position)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
            let items: Vec<(String, f64, Option<String>)> = sqlx::query_as(
                "SELECT title,position,assignee_id FROM checklist_items WHERE checklist_id=?",
            )
            .bind(source)
            .fetch_all(&mut *tx)
            .await?;
            for (title, position, assignee) in items {
                sqlx::query("INSERT INTO checklist_items(id,checklist_id,title,position,assignee_id,is_done,created_at) VALUES(?,?,?,?,?,0,?)").bind(uuid::Uuid::now_v7().to_string()).bind(&list).bind(title).bind(position).bind(assignee).bind(&now).execute(&mut *tx).await?;
            }
        }
        sqlx::query("UPDATE card_productivity SET last_occurrence=? WHERE card_id=?")
            .bind(revision)
            .bind(&card)
            .execute(&mut *tx)
            .await?;
        crate::features::enterprise::repository::audit(
            &mut tx,
            &p,
            Some(&next),
            None,
            "recurring_task_created",
            json!({"source_card_id":card}),
        )
        .await?;
        status_connection(&mut tx, &next).await?;
        projects.push(p);
    }
    let reminders:Vec<(String,String,String,String)>=sqlx::query_as("SELECT c.id,c.project_id,c.title,c.due_date FROM cards c JOIN columns col ON col.id=c.column_id JOIN card_productivity cp ON cp.card_id=c.id WHERE c.archived_at IS NULL AND col.type!='done' AND cp.reminder_minutes IS NOT NULL AND c.due_date IS NOT NULL AND (cp.reminded_for IS NULL OR cp.reminded_for!=c.due_date) AND julianday(c.due_date)-cp.reminder_minutes/1440.0<=julianday('now')").fetch_all(&mut *tx).await?;
    for (card, p, title, due) in reminders {
        let users:Vec<String>=sqlx::query_scalar("SELECT DISTINCT u.id FROM users u JOIN workspace_members wm ON wm.user_id=u.id JOIN projects p ON p.workspace_id=wm.workspace_id LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=u.id WHERE p.id=? AND (p.visibility!='private' OR wm.role IN('owner','admin') OR pm.user_id IS NOT NULL) AND (u.id IN(SELECT user_id FROM card_assignees WHERE card_id=?) OR u.id IN(SELECT user_id FROM card_watchers WHERE card_id=?))").bind(&p).bind(&card).bind(&card).fetch_all(&mut *tx).await?;
        for u in users {
            sqlx::query("INSERT INTO notifications(id,user_id,type,payload,created_at) VALUES(?,?,'due_reminder',?,?)").bind(uuid::Uuid::now_v7().to_string()).bind(u).bind(json!({"card_id":card,"title":title,"message":format!("Upcoming task: {title}")}).to_string()).bind(&now).execute(&mut *tx).await?;
        }
        sqlx::query("UPDATE card_productivity SET reminded_for=? WHERE card_id=?")
            .bind(due)
            .bind(&card)
            .execute(&mut *tx)
            .await?;
        projects.push(p);
    }
    tx.commit().await?;
    Ok(projects)
}
pub async fn capability(
    pool: &sqlx::SqlitePool,
    p: &str,
    c: &str,
) -> Result<bool, crate::error::AppError> {
    Ok(sqlx::query_scalar::<_, i64>(
        "SELECT allowed FROM project_member_permissions WHERE project_id=? AND capability=?",
    )
    .bind(p)
    .bind(c)
    .fetch_optional(pool)
    .await?
    .unwrap_or(1)
        == 1)
}
pub async fn permissions(
    pool: &sqlx::SqlitePool,
    p: &str,
) -> Result<serde_json::Value, crate::error::AppError> {
    let mut out = serde_json::Map::new();
    for c in super::policy::CAPABILITIES {
        out.insert(
            c.into(),
            serde_json::Value::Bool(capability(pool, p, c).await?),
        );
    }
    Ok(serde_json::Value::Object(out))
}
pub async fn set_permissions(
    pool: &sqlx::SqlitePool,
    p: &str,
    allowed: &[String],
) -> Result<(), crate::error::AppError> {
    let mut tx = pool.begin().await?;
    for c in super::policy::CAPABILITIES {
        sqlx::query("INSERT INTO project_member_permissions(project_id,capability,allowed) VALUES(?,?,?) ON CONFLICT(project_id,capability) DO UPDATE SET allowed=excluded.allowed").bind(p).bind(c).bind(allowed.iter().any(|a|a==c)).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    Ok(())
}
pub async fn capacity(
    pool: &sqlx::SqlitePool,
    w: &str,
) -> Result<serde_json::Value, crate::error::AppError> {
    let rows:Vec<(String,f64)>=sqlx::query_as("SELECT wm.user_id,COALESCE(tc.weekly_hours,40.0) FROM workspace_members wm LEFT JOIN team_capacity tc ON tc.workspace_id=wm.workspace_id AND tc.user_id=wm.user_id WHERE wm.workspace_id=?").bind(w).fetch_all(pool).await?;
    Ok(serde_json::json!(rows.into_iter().map(|(user_id,weekly_hours)|serde_json::json!({"user_id":user_id,"weekly_hours":weekly_hours})).collect::<Vec<_>>()))
}
pub async fn set_capacity(
    pool: &sqlx::SqlitePool,
    w: &str,
    u: &str,
    h: f64,
) -> Result<(), crate::error::AppError> {
    sqlx::query("INSERT INTO team_capacity(workspace_id,user_id,weekly_hours) VALUES(?,?,?) ON CONFLICT(workspace_id,user_id) DO UPDATE SET weekly_hours=excluded.weekly_hours").bind(w).bind(u).bind(h).execute(pool).await?;
    Ok(())
}
pub async fn project_workspace(pool: &SqlitePool, p: &str) -> Result<String, AppError> {
    Ok(
        sqlx::query_scalar("SELECT workspace_id FROM projects WHERE id=?")
            .bind(p)
            .fetch_one(pool)
            .await?,
    )
}
pub async fn development(pool: &SqlitePool, c: &str) -> Result<Value, AppError> {
    let rows:Vec<String>=sqlx::query_scalar("SELECT json_object('id',id,'kind',kind,'title',title,'url',url,'state',state,'updated_at',updated_at) FROM development_links WHERE card_id=? ORDER BY updated_at DESC LIMIT 100").bind(c).fetch_all(pool).await?;
    Ok(Value::Array(
        rows.into_iter()
            .map(|r| serde_json::from_str(&r).unwrap_or(Value::Null))
            .collect(),
    ))
}
pub async fn members(pool: &SqlitePool, p: &str) -> Result<Value, AppError> {
    let rows:Vec<String>=sqlx::query_scalar("SELECT json_object('id',COALESCE(pm.id,wm.id),'user_id',u.id,'email',u.email,'username',u.username,'display_name',u.display_name,'avatar_url',u.avatar_url,'role',CASE WHEN wm.role IN('owner','admin','viewer') THEN wm.role ELSE COALESCE(pm.role,wm.role) END,'joined_at',COALESCE(pm.joined_at,wm.joined_at),'inherited',wm.role IN('owner','admin')) FROM projects p JOIN workspace_members wm ON wm.workspace_id=p.workspace_id JOIN users u ON u.id=wm.user_id LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=u.id WHERE p.id=? AND (p.visibility!='private' OR wm.role IN('owner','admin') OR pm.user_id IS NOT NULL) ORDER BY u.display_name").bind(p).fetch_all(pool).await?;
    Ok(Value::Array(
        rows.into_iter()
            .map(|r| serde_json::from_str(&r).unwrap_or(Value::Null))
            .collect(),
    ))
}
pub async fn save_member(pool: &SqlitePool, p: &str, u: &str, role: &str) -> Result<(), AppError> {
    sqlx::query("INSERT INTO project_members(id,project_id,user_id,role,joined_at) VALUES(?,?,?,?,?) ON CONFLICT(project_id,user_id) DO UPDATE SET role=excluded.role").bind(uuid::Uuid::now_v7().to_string()).bind(p).bind(u).bind(role).bind(chrono::Utc::now().to_rfc3339()).execute(pool).await?;
    Ok(())
}
