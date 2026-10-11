use sqlx::SqlitePool;
use crate::{
    error::AppError,
    features::label::models::Label,
};

pub struct LabelRepository;

impl LabelRepository {
    pub async fn list_by_workspace(pool: &SqlitePool, workspace_id: &str) -> Result<Vec<Label>, AppError> {
        let labels = sqlx::query_as::<_, Label>(
            "SELECT id, workspace_id, name, color, created_at FROM labels WHERE workspace_id = ?1 ORDER BY name ASC"
        )
        .bind(workspace_id)
        .fetch_all(pool)
        .await?;

        Ok(labels)
    }

    pub async fn find_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Label>, AppError> {
        let label = sqlx::query_as::<_, Label>(
            "SELECT id, workspace_id, name, color, created_at FROM labels WHERE id = ?1"
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(label)
    }

    pub async fn create(
        pool: &SqlitePool,
        id: &str,
        workspace_id: &str,
        name: &str,
        color: &str,
        now: &str,
    ) -> Result<Label, AppError> {
        sqlx::query(
            "INSERT INTO labels (id, workspace_id, name, color, created_at) VALUES (?1, ?2, ?3, ?4, ?5)"
        )
        .bind(id)
        .bind(workspace_id)
        .bind(name)
        .bind(color)
        .bind(now)
        .execute(pool)
        .await?;

        let created = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve created label".to_string()))?;

        Ok(created)
    }

    pub async fn update(
        pool: &SqlitePool,
        id: &str,
        name: Option<&str>,
        color: Option<&str>,
    ) -> Result<Label, AppError> {
        let current = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Label not found".to_string()))?;

        let new_name = name.unwrap_or(&current.name);
        let new_color = color.unwrap_or(&current.color);

        sqlx::query("UPDATE labels SET name = ?1, color = ?2 WHERE id = ?3")
            .bind(new_name)
            .bind(new_color)
            .bind(id)
            .execute(pool)
            .await?;

        let updated = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated label".to_string()))?;

        Ok(updated)
    }

    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM labels WHERE id = ?1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }
}
