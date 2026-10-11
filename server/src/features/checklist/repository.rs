use sqlx::SqlitePool;
use crate::{
    error::AppError,
    features::checklist::{
        dto::{ChecklistItemResponse, ChecklistResponse},
        models::{Checklist, ChecklistItem},
    },
};

pub struct ChecklistRepository;

impl ChecklistRepository {
    pub async fn list_by_card(pool: &SqlitePool, card_id: &str) -> Result<Vec<ChecklistResponse>, AppError> {
        let checklists = sqlx::query_as::<_, Checklist>(
            "SELECT id, card_id, title, position, created_at FROM checklists WHERE card_id = ?1 ORDER BY position ASC"
        )
        .bind(card_id)
        .fetch_all(pool)
        .await?;

        let mut results = Vec::with_capacity(checklists.len());

        for ch in checklists {
            let items = sqlx::query_as::<_, ChecklistItem>(
                r#"
                SELECT id, checklist_id, title, is_done, position, assignee_id, due_date, created_at
                FROM checklist_items
                WHERE checklist_id = ?1
                ORDER BY position ASC
                "#
            )
            .bind(&ch.id)
            .fetch_all(pool)
            .await?
            .into_iter()
            .map(|i| ChecklistItemResponse {
                id: i.id,
                checklist_id: i.checklist_id,
                title: i.title,
                is_done: i.is_done == 1,
                position: i.position,
                assignee_id: i.assignee_id,
                due_date: i.due_date,
                created_at: i.created_at,
            })
            .collect();

            results.push(ChecklistResponse {
                id: ch.id,
                card_id: ch.card_id,
                title: ch.title,
                position: ch.position,
                items,
                created_at: ch.created_at,
            });
        }

        Ok(results)
    }

    pub async fn create_checklist(
        pool: &SqlitePool,
        id: &str,
        card_id: &str,
        title: &str,
        position: f64,
        now: &str,
    ) -> Result<Checklist, AppError> {
        sqlx::query(
            "INSERT INTO checklists (id, card_id, title, position, created_at) VALUES (?1, ?2, ?3, ?4, ?5)"
        )
        .bind(id)
        .bind(card_id)
        .bind(title)
        .bind(position)
        .bind(now)
        .execute(pool)
        .await?;

        let ch = sqlx::query_as::<_, Checklist>(
            "SELECT id, card_id, title, position, created_at FROM checklists WHERE id = ?1"
        )
        .bind(id)
        .fetch_one(pool)
        .await?;

        Ok(ch)
    }

    pub async fn delete_checklist(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM checklists WHERE id = ?1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn create_item(
        pool: &SqlitePool,
        id: &str,
        checklist_id: &str,
        title: &str,
        position: f64,
        assignee_id: Option<&str>,
        due_date: Option<&str>,
        now: &str,
    ) -> Result<ChecklistItem, AppError> {
        sqlx::query(
            r#"
            INSERT INTO checklist_items (id, checklist_id, title, is_done, position, assignee_id, due_date, created_at)
            VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6, ?7)
            "#
        )
        .bind(id)
        .bind(checklist_id)
        .bind(title)
        .bind(position)
        .bind(assignee_id)
        .bind(due_date)
        .bind(now)
        .execute(pool)
        .await?;

        let item = sqlx::query_as::<_, ChecklistItem>(
            "SELECT id, checklist_id, title, is_done, position, assignee_id, due_date, created_at FROM checklist_items WHERE id = ?1"
        )
        .bind(id)
        .fetch_one(pool)
        .await?;

        Ok(item)
    }

    pub async fn update_item(
        pool: &SqlitePool,
        id: &str,
        title: Option<&str>,
        is_done: Option<bool>,
        assignee_id: Option<Option<&str>>,
        due_date: Option<Option<&str>>,
    ) -> Result<ChecklistItem, AppError> {
        let current = sqlx::query_as::<_, ChecklistItem>(
            "SELECT id, checklist_id, title, is_done, position, assignee_id, due_date, created_at FROM checklist_items WHERE id = ?1"
        )
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Checklist item not found".to_string()))?;

        let new_title = title.unwrap_or(&current.title);
        let new_done = is_done.map(|d| if d { 1 } else { 0 }).unwrap_or(current.is_done);
        let new_assignee = match assignee_id {
            Some(opt) => opt,
            None => current.assignee_id.as_deref(),
        };
        let new_due = match due_date {
            Some(opt) => opt,
            None => current.due_date.as_deref(),
        };

        sqlx::query(
            "UPDATE checklist_items SET title = ?1, is_done = ?2, assignee_id = ?3, due_date = ?4 WHERE id = ?5"
        )
        .bind(new_title)
        .bind(new_done)
        .bind(new_assignee)
        .bind(new_due)
        .bind(id)
        .execute(pool)
        .await?;

        let updated = sqlx::query_as::<_, ChecklistItem>(
            "SELECT id, checklist_id, title, is_done, position, assignee_id, due_date, created_at FROM checklist_items WHERE id = ?1"
        )
        .bind(id)
        .fetch_one(pool)
        .await?;

        Ok(updated)
    }

    pub async fn delete_item(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM checklist_items WHERE id = ?1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }
}
