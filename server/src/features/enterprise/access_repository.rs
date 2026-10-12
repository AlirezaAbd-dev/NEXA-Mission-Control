use crate::error::AppError;
use sqlx::SqlitePool;
pub async fn project_for(
    pool: &SqlitePool,
    resource: &str,
    id: &str,
) -> Result<Option<String>, AppError> {
    let q=match resource{
 "projects"=>"SELECT id FROM projects WHERE id=?",
 "boards"=>"SELECT project_id FROM boards WHERE id=?",
 "columns"=>"SELECT b.project_id FROM columns c JOIN boards b ON b.id=c.board_id WHERE c.id=?",
 "cards"=>"SELECT project_id FROM cards WHERE id=?",
 "comments"=>"SELECT c.project_id FROM comments x JOIN cards c ON c.id=x.card_id WHERE x.id=?",
 "checklists"=>"SELECT c.project_id FROM checklists x JOIN cards c ON c.id=x.card_id WHERE x.id=?",
 "items"=>"SELECT c.project_id FROM checklist_items x JOIN checklists cl ON cl.id=x.checklist_id JOIN cards c ON c.id=cl.card_id WHERE x.id=?",
 "sprints"=>"SELECT project_id FROM sprints WHERE id=?",
 "time-logs"=>"SELECT c.project_id FROM time_logs x JOIN cards c ON c.id=x.card_id WHERE x.id=?",
 "custom-fields"=>"SELECT project_id FROM custom_field_definitions WHERE id=?",
 _=>return Ok(None)};
    Ok(sqlx::query_scalar(q).bind(id).fetch_optional(pool).await?)
}
pub async fn workspace_role(
    pool: &SqlitePool,
    workspace: &str,
    user: &str,
) -> Result<Option<String>, AppError> {
    Ok(
        sqlx::query_scalar("SELECT role FROM workspace_members WHERE workspace_id=? AND user_id=?")
            .bind(workspace)
            .bind(user)
            .fetch_optional(pool)
            .await?,
    )
}
pub async fn label_workspace(pool: &SqlitePool, id: &str) -> Result<Option<String>, AppError> {
    Ok(
        sqlx::query_scalar("SELECT workspace_id FROM labels WHERE id=?")
            .bind(id)
            .fetch_optional(pool)
            .await?,
    )
}

pub async fn internal_comment(pool: &SqlitePool, id: &str) -> Result<bool, AppError> {
    Ok(
        sqlx::query_scalar::<_, i64>("SELECT is_internal FROM comments WHERE id=?")
            .bind(id)
            .fetch_optional(pool)
            .await?
            .unwrap_or(0)
            == 1,
    )
}
