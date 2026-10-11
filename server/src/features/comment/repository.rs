use sqlx::SqlitePool;
use std::collections::HashMap;
use crate::{
    error::AppError,
    features::comment::{
        dto::{CommentResponse, ReactionResponse},
        models::Comment,
    },
};

pub struct CommentRepository;

impl CommentRepository {
    pub async fn list_by_card(pool: &SqlitePool, card_id: &str) -> Result<Vec<CommentResponse>, AppError> {
        let comments = sqlx::query_as::<_, (String, String, Option<String>, Option<String>, Option<String>, String, Option<String>, String)>(
            r#"
            SELECT c.id, c.card_id, c.author_id, u.display_name, u.avatar_url, c.body, c.edited_at, c.created_at
            FROM comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.card_id = ?1
            ORDER BY c.created_at ASC
            "#
        )
        .bind(card_id)
        .fetch_all(pool)
        .await?;

        let mut results = Vec::with_capacity(comments.len());

        for (id, card_id, author_id, display_name, avatar_url, body, edited_at, created_at) in comments {
            let reactions_raw = sqlx::query_as::<_, (String, String)>(
                "SELECT emoji, user_id FROM reactions WHERE comment_id = ?1"
            )
            .bind(&id)
            .fetch_all(pool)
            .await?;

            let mut reaction_map: HashMap<String, Vec<String>> = HashMap::new();
            for (emoji, user_id) in reactions_raw {
                reaction_map.entry(emoji).or_default().push(user_id);
            }

            let reactions = reaction_map
                .into_iter()
                .map(|(emoji, user_ids)| ReactionResponse {
                    count: user_ids.len() as i64,
                    emoji,
                    user_ids,
                })
                .collect();

            results.push(CommentResponse {
                id,
                card_id,
                author_id,
                author_name: display_name.unwrap_or_else(|| "Unknown".to_string()),
                author_avatar: avatar_url,
                body,
                edited_at,
                reactions,
                created_at,
            });
        }

        Ok(results)
    }

    pub async fn find_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Comment>, AppError> {
        let comment = sqlx::query_as::<_, Comment>(
            "SELECT id, card_id, author_id, body, edited_at, created_at FROM comments WHERE id = ?1"
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(comment)
    }

    pub async fn create(
        pool: &SqlitePool,
        id: &str,
        card_id: &str,
        author_id: &str,
        body: &str,
        now: &str,
    ) -> Result<Comment, AppError> {
        sqlx::query(
            "INSERT INTO comments (id, card_id, author_id, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5)"
        )
        .bind(id)
        .bind(card_id)
        .bind(author_id)
        .bind(body)
        .bind(now)
        .execute(pool)
        .await?;

        let created = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve created comment".to_string()))?;

        Ok(created)
    }

    pub async fn update(
        pool: &SqlitePool,
        id: &str,
        body: &str,
        now: &str,
    ) -> Result<Comment, AppError> {
        sqlx::query("UPDATE comments SET body = ?1, edited_at = ?2 WHERE id = ?3")
            .bind(body)
            .bind(now)
            .bind(id)
            .execute(pool)
            .await?;

        let updated = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated comment".to_string()))?;

        Ok(updated)
    }

    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM comments WHERE id = ?1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn toggle_reaction(
        pool: &SqlitePool,
        comment_id: &str,
        user_id: &str,
        emoji: &str,
    ) -> Result<(), AppError> {
        let existing = sqlx::query_as::<_, (String,)>(
            "SELECT id FROM reactions WHERE comment_id = ?1 AND user_id = ?2 AND emoji = ?3"
        )
        .bind(comment_id)
        .bind(user_id)
        .bind(emoji)
        .fetch_optional(pool)
        .await?;

        if let Some((id,)) = existing {
            sqlx::query("DELETE FROM reactions WHERE id = ?1")
                .bind(id)
                .execute(pool)
                .await?;
        } else {
            let id = uuid::Uuid::now_v7().to_string();
            sqlx::query("INSERT INTO reactions (id, comment_id, user_id, emoji) VALUES (?1, ?2, ?3, ?4)")
                .bind(id)
                .bind(comment_id)
                .bind(user_id)
                .bind(emoji)
                .execute(pool)
                .await?;
        }

        Ok(())
    }
}
