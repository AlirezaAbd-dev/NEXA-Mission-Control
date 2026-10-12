use crate::error::AppError;
use serde_json::Value;
use sqlx::SqlitePool;
pub async fn recipients(
    pool: &SqlitePool,
    card: &str,
) -> Result<Vec<(String, String, bool, String)>, AppError> {
    Ok(sqlx::query_as("SELECT u.id,u.username,EXISTS(SELECT 1 FROM card_watchers cw WHERE cw.card_id=c.id AND cw.user_id=u.id),CASE WHEN wm.role IN ('owner','admin','viewer') THEN wm.role ELSE COALESCE(pm.role,wm.role) END FROM cards c JOIN projects p ON p.id=c.project_id JOIN workspace_members wm ON wm.workspace_id=p.workspace_id JOIN users u ON u.id=wm.user_id LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=u.id WHERE c.id=? AND (p.visibility='public' OR wm.role IN ('owner','admin') OR pm.user_id IS NOT NULL)").bind(card).fetch_all(pool).await?)
}
pub async fn notify(
    pool: &SqlitePool,
    items: Vec<(String, String, Value)>,
) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;
    for (user, kind, payload) in items {
        sqlx::query(
            "INSERT INTO notifications(id,user_id,type,payload,created_at) VALUES(?,?,?,?,?)",
        )
        .bind(uuid::Uuid::now_v7().to_string())
        .bind(user)
        .bind(kind)
        .bind(payload.to_string())
        .bind(chrono::Utc::now().to_rfc3339())
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    Ok(())
}
pub async fn card_for_resource(
    pool: &SqlitePool,
    resource: &str,
    id: &str,
) -> Result<Option<String>, AppError> {
    let query=match resource{"cards"=>"SELECT id FROM cards WHERE id=?","comments"=>"SELECT card_id FROM comments WHERE id=?","checklists"=>"SELECT card_id FROM checklists WHERE id=?","items"=>"SELECT cl.card_id FROM checklist_items i JOIN checklists cl ON cl.id=i.checklist_id WHERE i.id=?","time-logs"=>"SELECT card_id FROM time_logs WHERE id=?",_=>return Ok(None)};
    Ok(sqlx::query_scalar(query)
        .bind(id)
        .fetch_optional(pool)
        .await?)
}
