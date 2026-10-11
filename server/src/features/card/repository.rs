use sqlx::SqlitePool;
use crate::{
    error::AppError,
    features::card::{
        dto::{CardAssigneeResponse, CardLabelResponse, CardResponse, ListCardsQuery},
        models::Card,
    },
};

pub struct CardRepository;

impl CardRepository {
    pub async fn list(pool: &SqlitePool, query: &ListCardsQuery) -> Result<Vec<CardResponse>, AppError> {
        let is_archived = query.archived.unwrap_or(false);

        // Fetch basic cards matching project_id and filters
        let mut sql = String::from(
            r#"
            SELECT id, project_id, column_id, title, description, priority, position,
                   creator_id, due_date, start_date, estimated_hours, cover_url,
                   archived_at, created_at, updated_at
            FROM cards
            WHERE project_id = ?1
            "#,
        );

        if is_archived {
            sql.push_str(" AND archived_at IS NOT NULL");
        } else {
            sql.push_str(" AND archived_at IS NULL");
        }

        if let Some(ref col_id) = query.column_id {
            sql.push_str(&format!(" AND column_id = '{}'", col_id.replace('\'', "''")));
        }

        if let Some(ref priority) = query.priority {
            sql.push_str(&format!(" AND priority = '{}'", priority.replace('\'', "''")));
        }

        if let Some(ref search) = query.search {
            let escaped = search.replace('\'', "''");
            sql.push_str(&format!(" AND (title LIKE '%{}%' OR description LIKE '%{}%')", escaped, escaped));
        }

        sql.push_str(" ORDER BY position ASC");

        let cards = sqlx::query_as::<_, Card>(&sql)
            .bind(&query.project_id)
            .fetch_all(pool)
            .await?;

        let mut results = Vec::with_capacity(cards.len());

        for c in cards {
            // Fetch assignees
            let assignees = sqlx::query_as::<_, (String, String, String, Option<String>)>(
                r#"
                SELECT u.id, u.username, u.display_name, u.avatar_url
                FROM card_assignees ca
                INNER JOIN users u ON ca.user_id = u.id
                WHERE ca.card_id = ?1
                "#
            )
            .bind(&c.id)
            .fetch_all(pool)
            .await?
            .into_iter()
            .map(|(user_id, username, display_name, avatar_url)| CardAssigneeResponse {
                user_id,
                username,
                display_name,
                avatar_url,
            })
            .collect();

            // Fetch labels
            let labels = sqlx::query_as::<_, (String, String, String)>(
                r#"
                SELECT l.id, l.name, l.color
                FROM card_labels cl
                INNER JOIN labels l ON cl.label_id = l.id
                WHERE cl.card_id = ?1
                "#
            )
            .bind(&c.id)
            .fetch_all(pool)
            .await?
            .into_iter()
            .map(|(id, name, color)| CardLabelResponse { id, name, color })
            .collect();

            // Checklist counts
            let checklist_stats = sqlx::query_as::<_, (i64, i64)>(
                r#"
                SELECT COUNT(ci.id), COALESCE(SUM(ci.is_done), 0)
                FROM checklists ch
                LEFT JOIN checklist_items ci ON ch.id = ci.checklist_id
                WHERE ch.card_id = ?1
                "#
            )
            .bind(&c.id)
            .fetch_one(pool)
            .await?;

            // Comments count
            let comments_count = sqlx::query_as::<_, (i64,)>(
                "SELECT COUNT(id) FROM comments WHERE card_id = ?1"
            )
            .bind(&c.id)
            .fetch_one(pool)
            .await?
            .0;

            results.push(CardResponse {
                id: c.id,
                project_id: c.project_id,
                column_id: c.column_id,
                title: c.title,
                description: c.description,
                priority: c.priority,
                position: c.position,
                creator_id: c.creator_id,
                due_date: c.due_date,
                start_date: c.start_date,
                estimated_hours: c.estimated_hours,
                cover_url: c.cover_url,
                archived_at: c.archived_at,
                assignees,
                labels,
                checklist_total: checklist_stats.0,
                checklist_completed: checklist_stats.1,
                comments_count,
                created_at: c.created_at,
                updated_at: c.updated_at,
            });
        }

        Ok(results)
    }

    pub async fn find_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Card>, AppError> {
        let card = sqlx::query_as::<_, Card>(
            r#"
            SELECT id, project_id, column_id, title, description, priority, position,
                   creator_id, due_date, start_date, estimated_hours, cover_url,
                   archived_at, created_at, updated_at
            FROM cards
            WHERE id = ?1
            "#
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(card)
    }

    pub async fn get_card_response(pool: &SqlitePool, id: &str) -> Result<Option<CardResponse>, AppError> {
        let c = match Self::find_by_id(pool, id).await? {
            Some(card) => card,
            None => return Ok(None),
        };

        let assignees = sqlx::query_as::<_, (String, String, String, Option<String>)>(
            r#"
            SELECT u.id, u.username, u.display_name, u.avatar_url
            FROM card_assignees ca
            INNER JOIN users u ON ca.user_id = u.id
            WHERE ca.card_id = ?1
            "#
        )
        .bind(&c.id)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|(user_id, username, display_name, avatar_url)| CardAssigneeResponse {
            user_id,
            username,
            display_name,
            avatar_url,
        })
        .collect();

        let labels = sqlx::query_as::<_, (String, String, String)>(
            r#"
            SELECT l.id, l.name, l.color
            FROM card_labels cl
            INNER JOIN labels l ON cl.label_id = l.id
            WHERE cl.card_id = ?1
            "#
        )
        .bind(&c.id)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|(id, name, color)| CardLabelResponse { id, name, color })
        .collect();

        let checklist_stats = sqlx::query_as::<_, (i64, i64)>(
            r#"
            SELECT COUNT(ci.id), COALESCE(SUM(ci.is_done), 0)
            FROM checklists ch
            LEFT JOIN checklist_items ci ON ch.id = ci.checklist_id
            WHERE ch.card_id = ?1
            "#
        )
        .bind(&c.id)
        .fetch_one(pool)
        .await?;

        let comments_count = sqlx::query_as::<_, (i64,)>(
            "SELECT COUNT(id) FROM comments WHERE card_id = ?1"
        )
        .bind(&c.id)
        .fetch_one(pool)
        .await?
        .0;

        Ok(Some(CardResponse {
            id: c.id,
            project_id: c.project_id,
            column_id: c.column_id,
            title: c.title,
            description: c.description,
            priority: c.priority,
            position: c.position,
            creator_id: c.creator_id,
            due_date: c.due_date,
            start_date: c.start_date,
            estimated_hours: c.estimated_hours,
            cover_url: c.cover_url,
            archived_at: c.archived_at,
            assignees,
            labels,
            checklist_total: checklist_stats.0,
            checklist_completed: checklist_stats.1,
            comments_count,
            created_at: c.created_at,
            updated_at: c.updated_at,
        }))
    }

    pub async fn create(
        pool: &SqlitePool,
        id: &str,
        project_id: &str,
        column_id: &str,
        title: &str,
        description: Option<&str>,
        priority: &str,
        position: f64,
        creator_id: Option<&str>,
        due_date: Option<&str>,
        start_date: Option<&str>,
        estimated_hours: Option<f64>,
        now: &str,
    ) -> Result<Card, AppError> {
        sqlx::query(
            r#"
            INSERT INTO cards (id, project_id, column_id, title, description, priority, position,
                               creator_id, due_date, start_date, estimated_hours, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)
            "#
        )
        .bind(id)
        .bind(project_id)
        .bind(column_id)
        .bind(title)
        .bind(description)
        .bind(priority)
        .bind(position)
        .bind(creator_id)
        .bind(due_date)
        .bind(start_date)
        .bind(estimated_hours)
        .bind(now)
        .execute(pool)
        .await?;

        let created = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve created card".to_string()))?;

        Ok(created)
    }

    pub async fn update(
        pool: &SqlitePool,
        id: &str,
        title: Option<&str>,
        description: Option<Option<&str>>,
        priority: Option<&str>,
        column_id: Option<&str>,
        position: Option<f64>,
        due_date: Option<Option<&str>>,
        start_date: Option<Option<&str>>,
        estimated_hours: Option<Option<f64>>,
        cover_url: Option<Option<&str>>,
        now: &str,
    ) -> Result<Card, AppError> {
        let current = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let new_title = title.unwrap_or(&current.title);
        let new_desc = match description {
            Some(opt) => opt,
            None => current.description.as_deref(),
        };
        let new_priority = priority.unwrap_or(&current.priority);
        let new_col = column_id.unwrap_or(&current.column_id);
        let new_pos = position.unwrap_or(current.position);
        let new_due = match due_date {
            Some(opt) => opt,
            None => current.due_date.as_deref(),
        };
        let new_start = match start_date {
            Some(opt) => opt,
            None => current.start_date.as_deref(),
        };
        let new_est = match estimated_hours {
            Some(opt) => opt,
            None => current.estimated_hours,
        };
        let new_cover = match cover_url {
            Some(opt) => opt,
            None => current.cover_url.as_deref(),
        };

        sqlx::query(
            r#"
            UPDATE cards
            SET title = ?1, description = ?2, priority = ?3, column_id = ?4, position = ?5,
                due_date = ?6, start_date = ?7, estimated_hours = ?8, cover_url = ?9, updated_at = ?10
            WHERE id = ?11
            "#
        )
        .bind(new_title)
        .bind(new_desc)
        .bind(new_priority)
        .bind(new_col)
        .bind(new_pos)
        .bind(new_due)
        .bind(new_start)
        .bind(new_est)
        .bind(new_cover)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;

        let updated = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated card".to_string()))?;

        Ok(updated)
    }

    pub async fn move_card(
        pool: &SqlitePool,
        id: &str,
        column_id: &str,
        position: f64,
        now: &str,
    ) -> Result<(), AppError> {
        sqlx::query("UPDATE cards SET column_id = ?1, position = ?2, updated_at = ?3 WHERE id = ?4")
            .bind(column_id)
            .bind(position)
            .bind(now)
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn archive(pool: &SqlitePool, id: &str, now: Option<&str>) -> Result<(), AppError> {
        sqlx::query("UPDATE cards SET archived_at = ?1 WHERE id = ?2")
            .bind(now)
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM cards WHERE id = ?1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn set_assignees(pool: &SqlitePool, card_id: &str, user_ids: &[String]) -> Result<(), AppError> {
        sqlx::query("DELETE FROM card_assignees WHERE card_id = ?1")
            .bind(card_id)
            .execute(pool)
            .await?;

        for uid in user_ids {
            sqlx::query("INSERT INTO card_assignees (card_id, user_id) VALUES (?1, ?2)")
                .bind(card_id)
                .bind(uid)
                .execute(pool)
                .await?;
        }

        Ok(())
    }

    pub async fn set_labels(pool: &SqlitePool, card_id: &str, label_ids: &[String]) -> Result<(), AppError> {
        sqlx::query("DELETE FROM card_labels WHERE card_id = ?1")
            .bind(card_id)
            .execute(pool)
            .await?;

        for lid in label_ids {
            sqlx::query("INSERT INTO card_labels (card_id, label_id) VALUES (?1, ?2)")
                .bind(card_id)
                .bind(lid)
                .execute(pool)
                .await?;
        }

        Ok(())
    }
}
