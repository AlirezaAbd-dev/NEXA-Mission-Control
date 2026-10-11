use sqlx::SqlitePool;
use crate::{
    error::AppError,
    features::sprint::{
        dto::SprintResponse,
        models::Sprint,
    },
};

pub struct SprintRepository;

impl SprintRepository {
    pub async fn list_by_project(pool: &SqlitePool, project_id: &str) -> Result<Vec<SprintResponse>, AppError> {
        let sprints = sqlx::query_as::<_, Sprint>(
            "SELECT id, project_id, name, goal, start_date, end_date, status, created_at FROM sprints WHERE project_id = ?1 ORDER BY created_at ASC"
        )
        .bind(project_id)
        .fetch_all(pool)
        .await?;

        let mut results = Vec::with_capacity(sprints.len());

        for s in sprints {
            let card_ids = sqlx::query_as::<_, (String,)>(
                "SELECT card_id FROM sprint_cards WHERE sprint_id = ?1"
            )
            .bind(&s.id)
            .fetch_all(pool)
            .await?
            .into_iter()
            .map(|(cid,)| cid)
            .collect();

            results.push(SprintResponse {
                id: s.id,
                project_id: s.project_id,
                name: s.name,
                goal: s.goal,
                start_date: s.start_date,
                end_date: s.end_date,
                status: s.status,
                card_ids,
                created_at: s.created_at,
            });
        }

        Ok(results)
    }

    pub async fn find_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Sprint>, AppError> {
        let sprint = sqlx::query_as::<_, Sprint>(
            "SELECT id, project_id, name, goal, start_date, end_date, status, created_at FROM sprints WHERE id = ?1"
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(sprint)
    }

    pub async fn create(
        pool: &SqlitePool,
        id: &str,
        project_id: &str,
        name: &str,
        goal: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
        now: &str,
    ) -> Result<Sprint, AppError> {
        sqlx::query(
            "INSERT INTO sprints (id, project_id, name, goal, start_date, end_date, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'planned', ?7)"
        )
        .bind(id)
        .bind(project_id)
        .bind(name)
        .bind(goal)
        .bind(start_date)
        .bind(end_date)
        .bind(now)
        .execute(pool)
        .await?;

        let s = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve created sprint".to_string()))?;

        Ok(s)
    }

    pub async fn update(
        pool: &SqlitePool,
        id: &str,
        name: Option<&str>,
        goal: Option<Option<&str>>,
        start_date: Option<Option<&str>>,
        end_date: Option<Option<&str>>,
        status: Option<&str>,
    ) -> Result<Sprint, AppError> {
        let current = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Sprint not found".to_string()))?;

        let new_name = name.unwrap_or(&current.name);
        let new_goal = match goal {
            Some(opt) => opt,
            None => current.goal.as_deref(),
        };
        let new_start = match start_date {
            Some(opt) => opt,
            None => current.start_date.as_deref(),
        };
        let new_end = match end_date {
            Some(opt) => opt,
            None => current.end_date.as_deref(),
        };
        let new_status = status.unwrap_or(&current.status);

        sqlx::query(
            "UPDATE sprints SET name = ?1, goal = ?2, start_date = ?3, end_date = ?4, status = ?5 WHERE id = ?6"
        )
        .bind(new_name)
        .bind(new_goal)
        .bind(new_start)
        .bind(new_end)
        .bind(new_status)
        .bind(id)
        .execute(pool)
        .await?;

        let updated = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated sprint".to_string()))?;

        Ok(updated)
    }

    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM sprints WHERE id = ?1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn add_card(pool: &SqlitePool, sprint_id: &str, card_id: &str, now: &str) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO sprint_cards (sprint_id, card_id, added_at) VALUES (?1, ?2, ?3) ON CONFLICT DO NOTHING"
        )
        .bind(sprint_id)
        .bind(card_id)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn remove_card(pool: &SqlitePool, sprint_id: &str, card_id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM sprint_cards WHERE sprint_id = ?1 AND card_id = ?2")
            .bind(sprint_id)
            .bind(card_id)
            .execute(pool)
            .await?;

        Ok(())
    }
}
