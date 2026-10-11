use sqlx::SqlitePool;
use crate::{
    error::AppError,
    features::board::models::{Board, Column},
};

pub struct BoardRepository;

impl BoardRepository {
    pub async fn find_by_project_id(pool: &SqlitePool, project_id: &str) -> Result<Option<Board>, AppError> {
        let board = sqlx::query_as::<_, Board>(
            "SELECT id, project_id, name, created_at FROM boards WHERE project_id = ?1"
        )
        .bind(project_id)
        .fetch_optional(pool)
        .await?;

        Ok(board)
    }

    pub async fn find_by_id(pool: &SqlitePool, board_id: &str) -> Result<Option<Board>, AppError> {
        let board = sqlx::query_as::<_, Board>(
            "SELECT id, project_id, name, created_at FROM boards WHERE id = ?1"
        )
        .bind(board_id)
        .fetch_optional(pool)
        .await?;

        Ok(board)
    }

    pub async fn list_columns(pool: &SqlitePool, board_id: &str) -> Result<Vec<Column>, AppError> {
        let columns = sqlx::query_as::<_, Column>(
            r#"
            SELECT id, board_id, name, type AS type_, position, wip_limit, created_at
            FROM columns
            WHERE board_id = ?1
            ORDER BY position ASC
            "#
        )
        .bind(board_id)
        .fetch_all(pool)
        .await?;

        Ok(columns)
    }

    pub async fn find_column_by_id(pool: &SqlitePool, column_id: &str) -> Result<Option<Column>, AppError> {
        let column = sqlx::query_as::<_, Column>(
            r#"
            SELECT id, board_id, name, type AS type_, position, wip_limit, created_at
            FROM columns
            WHERE id = ?1
            "#
        )
        .bind(column_id)
        .fetch_optional(pool)
        .await?;

        Ok(column)
    }

    pub async fn create_column(
        pool: &SqlitePool,
        id: &str,
        board_id: &str,
        name: &str,
        type_: &str,
        position: f64,
        wip_limit: Option<i64>,
        now: &str,
    ) -> Result<Column, AppError> {
        sqlx::query(
            "INSERT INTO columns (id, board_id, name, type, position, wip_limit, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
        )
        .bind(id)
        .bind(board_id)
        .bind(name)
        .bind(type_)
        .bind(position)
        .bind(wip_limit)
        .bind(now)
        .execute(pool)
        .await?;

        let created = Self::find_column_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve created column".to_string()))?;

        Ok(created)
    }

    pub async fn update_column(
        pool: &SqlitePool,
        id: &str,
        name: Option<&str>,
        type_: Option<&str>,
        position: Option<f64>,
        wip_limit: Option<Option<i64>>,
    ) -> Result<Column, AppError> {
        let current = Self::find_column_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Column not found".to_string()))?;

        let new_name = name.unwrap_or(&current.name);
        let new_type = type_.unwrap_or(&current.type_);
        let new_pos = position.unwrap_or(current.position);
        let new_wip = wip_limit.unwrap_or(current.wip_limit);

        sqlx::query(
            "UPDATE columns SET name = ?1, type = ?2, position = ?3, wip_limit = ?4 WHERE id = ?5"
        )
        .bind(new_name)
        .bind(new_type)
        .bind(new_pos)
        .bind(new_wip)
        .bind(id)
        .execute(pool)
        .await?;

        let updated = Self::find_column_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated column".to_string()))?;

        Ok(updated)
    }

    pub async fn delete_column(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM columns WHERE id = ?1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn update_column_position(pool: &SqlitePool, id: &str, position: f64) -> Result<(), AppError> {
        sqlx::query("UPDATE columns SET position = ?1 WHERE id = ?2")
            .bind(position)
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }
}
