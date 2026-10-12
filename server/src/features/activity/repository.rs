use crate::{error::AppError, features::activity::dto::ActivityResponse};
use sqlx::SqlitePool;

pub struct ActivityRepository;

impl ActivityRepository {
    pub async fn list_by_workspace(
        pool: &SqlitePool,
        workspace_id: &str,
        user_id: &str,
    ) -> Result<Vec<ActivityResponse>, AppError> {
        let rows = sqlx::query_as::<_, (String, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, String, String, String)>(
            r#"
            SELECT a.id, a.workspace_id, a.project_id, a.card_id, a.actor_id, u.display_name, u.avatar_url, a.action, a.payload, a.created_at
            FROM activities a
            LEFT JOIN users u ON a.actor_id = u.id
            WHERE a.workspace_id = ?1 AND EXISTS(SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=a.workspace_id AND wm.user_id=?2 AND (a.project_id IS NULL OR wm.role IN ('owner','admin') OR EXISTS(SELECT 1 FROM projects p WHERE p.id=a.project_id AND (p.visibility='public' OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=wm.user_id)))))
            ORDER BY a.created_at DESC
            LIMIT 50
            "#
        )
        .bind(workspace_id)
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        let results = rows
            .into_iter()
            .map(
                |(
                    id,
                    workspace_id,
                    project_id,
                    card_id,
                    actor_id,
                    display_name,
                    avatar_url,
                    action,
                    payload,
                    created_at,
                )| {
                    ActivityResponse {
                        id,
                        workspace_id,
                        project_id,
                        card_id,
                        actor_id,
                        actor_name: display_name.unwrap_or_else(|| "System".to_string()),
                        actor_avatar: avatar_url,
                        action,
                        payload: serde_json::from_str(&payload).unwrap_or(serde_json::json!({})),
                        created_at,
                    }
                },
            )
            .collect();

        Ok(results)
    }

    pub async fn list_by_card(
        pool: &SqlitePool,
        card_id: &str,
    ) -> Result<Vec<ActivityResponse>, AppError> {
        let rows = sqlx::query_as::<_, (String, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, String, String, String)>(
            r#"
            SELECT a.id, a.workspace_id, a.project_id, a.card_id, a.actor_id, u.display_name, u.avatar_url, a.action, a.payload, a.created_at
            FROM activities a
            LEFT JOIN users u ON a.actor_id = u.id
            WHERE a.card_id = ?1
            ORDER BY a.created_at DESC
            LIMIT 50
            "#
        )
        .bind(card_id)
        .fetch_all(pool)
        .await?;

        let results = rows
            .into_iter()
            .map(
                |(
                    id,
                    workspace_id,
                    project_id,
                    card_id,
                    actor_id,
                    display_name,
                    avatar_url,
                    action,
                    payload,
                    created_at,
                )| {
                    ActivityResponse {
                        id,
                        workspace_id,
                        project_id,
                        card_id,
                        actor_id,
                        actor_name: display_name.unwrap_or_else(|| "System".to_string()),
                        actor_avatar: avatar_url,
                        action,
                        payload: serde_json::from_str(&payload).unwrap_or(serde_json::json!({})),
                        created_at,
                    }
                },
            )
            .collect();

        Ok(results)
    }
}
