use super::dto::*;
use crate::error::AppError;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};
const FIELDS:&str="n.id,n.owner_id,n.workspace_id,n.created_by,u.display_name AS author_name,n.title,n.pinned,n.version,n.deleted_at,n.created_at,n.updated_at,0 AS can_edit";
pub async fn get(pool: &SqlitePool, id: &str) -> Result<Option<Note>, AppError> {
    Ok(sqlx::query_as(&format!(
        "SELECT {FIELDS},n.body FROM notes n LEFT JOIN users u ON u.id=n.created_by WHERE n.id=?"
    ))
    .bind(id)
    .fetch_optional(pool)
    .await?)
}
pub async fn list(
    pool: &SqlitePool,
    user: &str,
    workspace: Option<&str>,
    q: Option<&str>,
    trash: bool,
) -> Result<Vec<Note>, AppError> {
    let mut sql = QueryBuilder::<Sqlite>::new(format!(
        "SELECT {FIELDS},NULL AS body FROM notes n LEFT JOIN users u ON u.id=n.created_by WHERE "
    ));
    if let Some(ws) = workspace {
        sql.push("n.workspace_id=").push_bind(ws);
    } else {
        sql.push("n.owner_id=").push_bind(user);
    }
    sql.push(if trash {
        " AND n.deleted_at IS NOT NULL"
    } else {
        " AND n.deleted_at IS NULL"
    });
    if let Some(q) = q.filter(|q| !q.trim().is_empty()) {
        let phrase = format!("\"{}\"*", q.trim().replace('"', "\"\""));
        sql.push(" AND n.rowid IN (SELECT rowid FROM notes_fts WHERE notes_fts MATCH ")
            .push_bind(phrase)
            .push(")");
    }
    sql.push(" ORDER BY n.pinned DESC,n.updated_at DESC,n.id DESC LIMIT 200");
    Ok(sql.build_query_as::<Note>().fetch_all(pool).await?)
}
pub async fn create(pool: &SqlitePool, user: &str, r: &CreateNote) -> Result<String, AppError> {
    let id = uuid::Uuid::now_v7().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("INSERT INTO notes(id,owner_id,workspace_id,created_by,title,body,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
 .bind(&id).bind(if r.workspace_id.is_none(){Some(user)}else{None}).bind(&r.workspace_id).bind(user).bind(&r.title).bind(&r.body).bind(&now).bind(&now).execute(pool).await?;
    Ok(id)
}
pub async fn update(pool: &SqlitePool, note: &Note, r: &UpdateNote) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    let deleted = match r.trashed {
        Some(true) => Some(now.as_str()),
        Some(false) => None,
        None => note.deleted_at.as_deref(),
    };
    let result=sqlx::query("UPDATE notes SET title=?,body=?,pinned=?,deleted_at=?,updated_at=?,version=version+1 WHERE id=? AND version=?")
 .bind(r.title.as_deref().unwrap_or(&note.title)).bind(r.body.as_deref().or(note.body.as_deref()).unwrap_or(""))
 .bind(r.pinned.unwrap_or(note.pinned)).bind(deleted).bind(&now).bind(&note.id).bind(r.version).execute(pool).await?;
    if result.rows_affected() != 1 {
        return Err(AppError::Conflict("This note changed elsewhere. Your draft is preserved; reload the latest version before saving.".into()));
    }
    Ok(())
}
pub async fn links(pool: &SqlitePool, note: &str, user: &str) -> Result<Vec<NoteLink>, AppError> {
    Ok(sqlx::query_as("SELECT c.id AS card_id,c.title,c.project_id,p.name AS project_name,c.archived_at IS NOT NULL AS archived FROM note_links l JOIN cards c ON c.id=l.card_id JOIN projects p ON p.id=c.project_id JOIN workspace_members wm ON wm.workspace_id=p.workspace_id WHERE l.note_id=? AND wm.user_id=? AND (p.visibility='public' OR wm.role IN ('owner','admin') OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=wm.user_id)) ORDER BY p.name,c.title").bind(note).bind(user).fetch_all(pool).await?)
}
pub async fn link(pool: &SqlitePool, note: &str, card: &str, remove: bool) -> Result<(), AppError> {
    let sql = if remove {
        "DELETE FROM note_links WHERE note_id=? AND card_id=?"
    } else {
        "INSERT OR IGNORE INTO note_links(note_id,card_id) VALUES(?,?)"
    };
    sqlx::query(sql).bind(note).bind(card).execute(pool).await?;
    Ok(())
}
