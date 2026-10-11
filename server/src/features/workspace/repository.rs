use sqlx::SqlitePool;
use crate::{
    error::AppError,
    features::workspace::{
        dto::{WorkspaceMemberResponse, WorkspaceResponse},
        models::Workspace,
    },
};

pub struct WorkspaceRepository;

impl WorkspaceRepository {
    pub async fn list_for_user(pool: &SqlitePool, user_id: &str) -> Result<Vec<WorkspaceResponse>, AppError> {
        let rows = sqlx::query_as::<_, (String, String, String, Option<String>, Option<String>, String, String, String, String)>(
            r#"
            SELECT w.id, w.name, w.slug, w.description, w.logo_url, w.owner_id, wm.role, w.created_at, w.updated_at
            FROM workspaces w
            INNER JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id = ?1
            ORDER BY w.created_at ASC
            "#
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        let workspaces = rows.into_iter().map(|(id, name, slug, description, logo_url, owner_id, role, created_at, updated_at)| {
            WorkspaceResponse {
                id,
                name,
                slug,
                description,
                logo_url,
                owner_id,
                user_role: role,
                created_at,
                updated_at,
            }
        }).collect();

        Ok(workspaces)
    }

    pub async fn find_by_id(pool: &SqlitePool, workspace_id: &str) -> Result<Option<Workspace>, AppError> {
        let ws = sqlx::query_as::<_, Workspace>(
            "SELECT id, name, slug, description, logo_url, owner_id, created_at, updated_at FROM workspaces WHERE id = ?1"
        )
        .bind(workspace_id)
        .fetch_optional(pool)
        .await?;

        Ok(ws)
    }

    pub async fn get_user_role(pool: &SqlitePool, workspace_id: &str, user_id: &str) -> Result<Option<String>, AppError> {
        let row = sqlx::query_as::<_, (String,)>(
            "SELECT role FROM workspace_members WHERE workspace_id = ?1 AND user_id = ?2"
        )
        .bind(workspace_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|r| r.0))
    }

    pub async fn create(
        pool: &SqlitePool,
        id: &str,
        name: &str,
        slug: &str,
        description: Option<&str>,
        logo_url: Option<&str>,
        owner_id: &str,
        now: &str,
    ) -> Result<Workspace, AppError> {
        sqlx::query(
            "INSERT INTO workspaces (id, name, slug, description, logo_url, owner_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)"
        )
        .bind(id)
        .bind(name)
        .bind(slug)
        .bind(description)
        .bind(logo_url)
        .bind(owner_id)
        .bind(now)
        .execute(pool)
        .await?;

        let member_id = uuid::Uuid::now_v7().to_string();
        sqlx::query(
            "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?1, ?2, ?3, 'owner', ?4)"
        )
        .bind(&member_id)
        .bind(id)
        .bind(owner_id)
        .bind(now)
        .execute(pool)
        .await?;

        let created = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve created workspace".to_string()))?;

        Ok(created)
    }

    pub async fn update(
        pool: &SqlitePool,
        id: &str,
        name: Option<&str>,
        description: Option<&str>,
        logo_url: Option<&str>,
        now: &str,
    ) -> Result<Workspace, AppError> {
        let current = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;

        let new_name = name.unwrap_or(&current.name);
        let new_desc = description.or(current.description.as_deref());
        let new_logo = logo_url.or(current.logo_url.as_deref());

        sqlx::query(
            "UPDATE workspaces SET name = ?1, description = ?2, logo_url = ?3, updated_at = ?4 WHERE id = ?5"
        )
        .bind(new_name)
        .bind(new_desc)
        .bind(new_logo)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;

        let updated = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated workspace".to_string()))?;

        Ok(updated)
    }

    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM workspaces WHERE id = ?1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn list_members(pool: &SqlitePool, workspace_id: &str) -> Result<Vec<WorkspaceMemberResponse>, AppError> {
        let rows = sqlx::query_as::<_, (String, String, String, String, String, Option<String>, String, String)>(
            r#"
            SELECT wm.id, u.id, u.email, u.username, u.display_name, u.avatar_url, wm.role, wm.joined_at
            FROM workspace_members wm
            INNER JOIN users u ON wm.user_id = u.id
            WHERE wm.workspace_id = ?1
            ORDER BY wm.joined_at ASC
            "#
        )
        .bind(workspace_id)
        .fetch_all(pool)
        .await?;

        let members = rows.into_iter().map(|(id, user_id, email, username, display_name, avatar_url, role, joined_at)| {
            WorkspaceMemberResponse {
                id,
                user_id,
                email,
                username,
                display_name,
                avatar_url,
                role,
                joined_at,
            }
        }).collect();

        Ok(members)
    }

    pub async fn add_member(
        pool: &SqlitePool,
        workspace_id: &str,
        user_id: &str,
        role: &str,
        now: &str,
    ) -> Result<(), AppError> {
        let member_id = uuid::Uuid::now_v7().to_string();
        sqlx::query(
            "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(workspace_id, user_id) DO UPDATE SET role = excluded.role"
        )
        .bind(&member_id)
        .bind(workspace_id)
        .bind(user_id)
        .bind(role)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn remove_member(pool: &SqlitePool, workspace_id: &str, user_id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM workspace_members WHERE workspace_id = ?1 AND user_id = ?2")
            .bind(workspace_id)
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(())
    }
}
