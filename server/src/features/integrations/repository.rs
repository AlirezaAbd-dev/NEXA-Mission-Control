use crate::error::AppError;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
pub fn token_hash(token: &str) -> String {
    format!("{:x}", Sha256::digest(token.as_bytes()))
}
pub async fn tokens(pool: &SqlitePool, user: &str) -> Result<Value, AppError> {
    let rows:Vec<(String,String,String,String)>=sqlx::query_as("SELECT id,name,expires_at,created_at FROM api_tokens WHERE user_id=? ORDER BY created_at DESC").bind(user).fetch_all(pool).await?;
    Ok(json!(rows.into_iter().map(|(id,name,expires_at,created_at)|json!({"id":id,"name":name,"expires_at":expires_at,"created_at":created_at})).collect::<Vec<_>>()))
}
pub async fn create_token(
    pool: &SqlitePool,
    user: &str,
    id: &str,
    name: &str,
    token: &str,
    expires: &str,
) -> Result<(), AppError> {
    sqlx::query("INSERT INTO api_tokens(id,user_id,name,token_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)").bind(id).bind(user).bind(name).bind(token_hash(token)).bind(expires).bind(chrono::Utc::now().to_rfc3339()).execute(pool).await?;
    Ok(())
}
pub async fn revoke(pool: &SqlitePool, user: &str, id: &str) -> Result<(), AppError> {
    sqlx::query("DELETE FROM api_tokens WHERE id=? AND user_id=?")
        .bind(id)
        .bind(user)
        .execute(pool)
        .await?;
    Ok(())
}
pub async fn authenticate(
    pool: &SqlitePool,
    token: &str,
) -> Result<Option<(String, String, String)>, AppError> {
    Ok(sqlx::query_as("SELECT u.id,u.email,u.role FROM api_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>?").bind(token_hash(token)).bind(chrono::Utc::now().to_rfc3339()).fetch_optional(pool).await?)
}
pub async fn integration(
    pool: &SqlitePool,
    id: &str,
    kind: &str,
) -> Result<(String, Value), AppError> {
    let row: Option<(String, String)> = sqlx::query_as(
        "SELECT project_id,config_json FROM project_integrations WHERE id=? AND kind=?",
    )
    .bind(id)
    .bind(kind)
    .fetch_optional(pool)
    .await?;
    let (p, c) = row.ok_or_else(|| AppError::NotFound("Integration not found".into()))?;
    Ok((
        p,
        serde_json::from_str(&c)
            .map_err(|_| AppError::Internal("Invalid integration configuration".into()))?,
    ))
}
pub async fn receipt(pool: &SqlitePool, id: &str, delivery: &str) -> Result<bool, AppError> {
    Ok(sqlx::query("INSERT OR IGNORE INTO webhook_receipts(integration_id,delivery_id,created_at) VALUES(?,?,?)").bind(id).bind(delivery).bind(chrono::Utc::now().to_rfc3339()).execute(pool).await?.rows_affected()>0)
}
pub async fn commit(
    pool: &SqlitePool,
    p: &str,
    key: &str,
    hash: &str,
    message: &str,
    done: bool,
) -> Result<bool, AppError> {
    let cards: Vec<String> = sqlx::query_scalar(
        "SELECT id FROM cards WHERE project_id=? AND archived_at IS NULL AND id LIKE ?",
    )
    .bind(p)
    .bind(format!("{key}%"))
    .fetch_all(pool)
    .await?;
    if cards.len() != 1 {
        return Ok(false);
    }
    let card = &cards[0];
    let exists:i64=sqlx::query_scalar("SELECT COUNT(*) FROM activities WHERE card_id=? AND action='linked_commit' AND json_extract(payload,'$.hash')=?").bind(card).bind(hash).fetch_one(pool).await?;
    if exists > 0 {
        return Ok(false);
    }
    let mut tx = pool.begin().await?;
    if done {
        let target:Option<String>=sqlx::query_scalar("SELECT col.id FROM columns col JOIN boards b ON b.id=col.board_id WHERE b.project_id=? AND col.type='done' ORDER BY col.position LIMIT 1").bind(p).fetch_optional(&mut *tx).await?;
        if let Some(target) = target {
            crate::features::productivity::workflow::check_connection(
                &mut tx, p, card, &target, None,
            )
            .await?;
        }
        sqlx::query("UPDATE cards SET column_id=COALESCE((SELECT col.id FROM columns col JOIN boards b ON b.id=col.board_id WHERE b.project_id=? AND col.type='done' ORDER BY col.position LIMIT 1),column_id),updated_at=? WHERE id=?").bind(p).bind(chrono::Utc::now().to_rfc3339()).bind(card).execute(&mut *tx).await?;
    }
    crate::features::enterprise::repository::audit(
        &mut tx,
        p,
        Some(card),
        None,
        "linked_commit",
        json!({"hash":hash,"message":message}),
    )
    .await?;
    tx.commit().await?;
    crate::features::enterprise::operations::sync_resolution(pool, card).await?;
    Ok(true)
}
pub async fn outbound(pool: &SqlitePool, p: &str) -> Result<Vec<(String, String)>, AppError> {
    let rows:Vec<(String,String)>=sqlx::query_as("SELECT kind,config_json FROM project_integrations WHERE project_id=? AND kind IN ('slack','discord')").bind(p).fetch_all(pool).await?;
    Ok(rows
        .into_iter()
        .filter_map(|(kind, c)| {
            serde_json::from_str::<Value>(&c)
                .ok()
                .and_then(|v| v["url"].as_str().map(|s| (kind, s.to_owned())))
        })
        .collect())
}

pub async fn seen_receipt(pool: &SqlitePool, id: &str, delivery: &str) -> Result<bool, AppError> {
    Ok(sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM webhook_receipts WHERE integration_id=? AND delivery_id=?",
    )
    .bind(id)
    .bind(delivery)
    .fetch_one(pool)
    .await?
        > 0)
}

pub async fn mail_card(
    pool: &SqlitePool,
    p: &str,
    user: &str,
    column: &str,
    title: &str,
    description: &str,
    integration: &str,
    delivery: &str,
) -> Result<Option<String>, AppError> {
    let mut tx = pool.begin().await?;
    let now = chrono::Utc::now().to_rfc3339();
    let inserted=sqlx::query("INSERT OR IGNORE INTO webhook_receipts(integration_id,delivery_id,created_at) VALUES(?,?,?)").bind(integration).bind(delivery).bind(&now).execute(&mut *tx).await?.rows_affected();
    if inserted == 0 {
        return Ok(None);
    }
    let id = uuid::Uuid::now_v7().to_string();
    sqlx::query("INSERT INTO cards(id,project_id,column_id,title,description,priority,position,creator_id,created_at,updated_at) VALUES(?,?,?,?,?,'no_priority',COALESCE((SELECT MAX(position)+65536 FROM cards WHERE column_id=?),65536),?,?,?)").bind(&id).bind(p).bind(column).bind(title).bind(description).bind(column).bind(user).bind(&now).bind(&now).execute(&mut *tx).await?;
    crate::features::enterprise::repository::audit(
        &mut tx,
        p,
        Some(&id),
        Some(user),
        "email_created_task",
        json!({"title":title,"integration_id":integration}),
    )
    .await?;
    tx.commit().await?;
    Ok(Some(id))
}
pub async fn resolve_card(
    pool: &SqlitePool,
    p: &str,
    key: &str,
) -> Result<Option<String>, AppError> {
    let rows: Vec<String> = sqlx::query_scalar(
        "SELECT id FROM cards WHERE project_id=? AND archived_at IS NULL AND id LIKE ? LIMIT 2",
    )
    .bind(p)
    .bind(format!("{key}%"))
    .fetch_all(pool)
    .await?;
    Ok(if rows.len() == 1 {
        rows.first().cloned()
    } else {
        None
    })
}
pub async fn development_link(
    pool: &SqlitePool,
    c: &str,
    integration: &str,
    kind: &str,
    external: &str,
    title: &str,
    url: &str,
    state: &str,
) -> Result<(), AppError> {
    sqlx::query("INSERT INTO development_links(id,card_id,integration_id,kind,external_id,title,url,state,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(card_id,integration_id,kind,external_id) DO UPDATE SET title=excluded.title,url=excluded.url,state=excluded.state,updated_at=excluded.updated_at").bind(uuid::Uuid::now_v7().to_string()).bind(c).bind(integration).bind(kind).bind(external).bind(title).bind(url).bind(state).bind(chrono::Utc::now().to_rfc3339()).execute(pool).await?;
    Ok(())
}
