use sqlx::SqlitePool;
use crate::{
    error::AppError,
    features::project::models::Project,
};

pub struct ProjectRepository;

impl ProjectRepository {
    pub async fn list_by_workspace(pool: &SqlitePool, workspace_id: &str) -> Result<Vec<Project>, AppError> {
        let projects = sqlx::query_as::<_, Project>(
            r#"
            SELECT id, workspace_id, name, identifier, description, color, cover_url, visibility, archived_at, created_at, updated_at
            FROM projects
            WHERE workspace_id = ?1
            ORDER BY created_at ASC
            "#
        )
        .bind(workspace_id)
        .fetch_all(pool)
        .await?;

        Ok(projects)
    }

    pub async fn find_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Project>, AppError> {
        let project = sqlx::query_as::<_, Project>(
            r#"
            SELECT id, workspace_id, name, identifier, description, color, cover_url, visibility, archived_at, created_at, updated_at
            FROM projects
            WHERE id = ?1
            "#
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(project)
    }

    pub async fn create(
        pool: &SqlitePool,
        id: &str,
        workspace_id: &str,
        name: &str,
        identifier: &str,
        description: Option<&str>,
        color: Option<&str>,
        cover_url: Option<&str>,
        visibility: &str,
        now: &str,
    ) -> Result<Project, AppError> {
        sqlx::query(
            r#"
            INSERT INTO projects (id, workspace_id, name, identifier, description, color, cover_url, visibility, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
            "#
        )
        .bind(id)
        .bind(workspace_id)
        .bind(name)
        .bind(identifier)
        .bind(description)
        .bind(color)
        .bind(cover_url)
        .bind(visibility)
        .bind(now)
        .execute(pool)
        .await?;

        let created = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve created project".to_string()))?;

        Ok(created)
    }

    pub async fn update(
        pool: &SqlitePool,
        id: &str,
        name: Option<&str>,
        description: Option<&str>,
        color: Option<&str>,
        cover_url: Option<&str>,
        visibility: Option<&str>,
        now: &str,
    ) -> Result<Project, AppError> {
        let current = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let new_name = name.unwrap_or(&current.name);
        let new_desc = description.or(current.description.as_deref());
        let new_color = color.or(current.color.as_deref());
        let new_cover = cover_url.or(current.cover_url.as_deref());
        let new_visibility = visibility.unwrap_or(&current.visibility);

        sqlx::query(
            r#"
            UPDATE projects
            SET name = ?1, description = ?2, color = ?3, cover_url = ?4, visibility = ?5, updated_at = ?6
            WHERE id = ?7
            "#
        )
        .bind(new_name)
        .bind(new_desc)
        .bind(new_color)
        .bind(new_cover)
        .bind(new_visibility)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;

        let updated = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated project".to_string()))?;

        Ok(updated)
    }

    pub async fn archive(pool: &SqlitePool, id: &str, now: Option<&str>) -> Result<(), AppError> {
        sqlx::query("UPDATE projects SET archived_at = ?1 WHERE id = ?2")
            .bind(now)
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM projects WHERE id = ?1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }
}
