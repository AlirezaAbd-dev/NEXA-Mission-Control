use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        card::{
            dto::{
                CardResponse, CreateCardRequest, ListCardsQuery, MoveCardRequest, UpdateCardRequest,
            },
            repository::CardRepository,
        },
        project::repository::ProjectRepository,
    },
    state::AppState,
};

pub struct CardService;

impl CardService {
    pub async fn list(
        state: &AppState,
        user_id: &str,
        query: ListCardsQuery,
    ) -> Result<Vec<CardResponse>, AppError> {
        let project = ProjectRepository::find_by_id(&state.pool, &query.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, false, false)
            .await?;

        CardRepository::list(&state.pool, &query, Some(user_id)).await
    }

    pub async fn get_by_id(
        state: &AppState,
        id: &str,
        user_id: &str,
    ) -> Result<CardResponse, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, false, false)
            .await?;

        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))
    }

    pub async fn create(
        state: &AppState,
        user_id: &str,
        req: CreateCardRequest,
    ) -> Result<CardResponse, AppError> {
        req.validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &req.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, true, false)
            .await?;

        crate::features::enterprise::operations::require_column(
            &state.pool,
            &project.id,
            &req.column_id,
        )
        .await?;
        if let Some(priority) = &req.priority {
            crate::features::enterprise::service::validate_priority(priority)?;
        }
        if let Some(ids) = &req.assignee_ids {
            for id in ids {
                crate::features::enterprise::operations::require_member(
                    &state.pool,
                    &project.id,
                    id,
                )
                .await?;
            }
        }
        if let Some(ids) = &req.label_ids {
            for id in ids {
                crate::features::enterprise::operations::require_label(
                    &state.pool,
                    &project.id,
                    id,
                )
                .await?;
            }
        }
        validate_schedule(req.start_date.as_deref(), req.due_date.as_deref())?;
        if req.story_points.is_some_and(|n| !n.is_finite() || n < 0.0)
            || req
                .estimated_hours
                .is_some_and(|n| !n.is_finite() || n < 0.0)
        {
            return Err(AppError::Validation(
                "Estimates must be non-negative numbers".into(),
            ));
        }
        let id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();
        let priority = req.priority.unwrap_or_else(|| "no_priority".to_string());
        let position = req.position.unwrap_or(1000.0);

        CardRepository::create(
            &state.pool,
            &id,
            &req.project_id,
            &req.column_id,
            &req.title,
            req.description.as_deref(),
            &priority,
            position,
            Some(user_id),
            req.due_date.as_deref(),
            req.start_date.as_deref(),
            req.estimated_hours,
            req.is_template.unwrap_or(false),
            req.story_points,
            &now,
        )
        .await?;

        if let Some(ref assignees) = req.assignee_ids {
            CardRepository::set_assignees(&state.pool, &id, assignees).await?;
        }

        if let Some(ref labels) = req.label_ids {
            CardRepository::set_labels(&state.pool, &id, labels).await?;
        }

        // Log activity
        let _ = sqlx::query(
            "INSERT INTO activities (id, workspace_id, project_id, card_id, actor_id, action, payload, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 'created_card', ?6, ?7)"
        )
        .bind(Uuid::now_v7().to_string())
        .bind(&project.workspace_id)
        .bind(&project.id)
        .bind(&id)
        .bind(user_id)
        .bind(serde_json::json!({ "title": req.title }).to_string())
        .bind(&now)
        .execute(&state.pool)
        .await;

        crate::features::enterprise::operations::sync_resolution(&state.pool, &id).await?;
        crate::features::enterprise::automation::dispatch(
            state,
            &project.id,
            &id,
            "card_created",
            Some(user_id),
        )
        .await?;
        CardRepository::get_card_response(&state.pool, &id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve created card".to_string()))
    }

    pub async fn update(
        state: &AppState,
        id: &str,
        user_id: &str,
        req: UpdateCardRequest,
    ) -> Result<CardResponse, AppError> {
        req.validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;

        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, true, false)
            .await?;

        let now = Utc::now().to_rfc3339();

        if let Some(column) = &req.column_id {
            crate::features::enterprise::operations::require_column(
                &state.pool,
                &project.id,
                column,
            )
            .await?;
        }
        if let Some(column)=&req.column_id{crate::features::productivity::workflow::check(state,&project.id,id,column,Some(user_id)).await?;}
        if let Some(priority) = &req.priority {
            crate::features::enterprise::service::validate_priority(priority)?;
        }
        if let Some(title) = &req.title {
            if title.trim().is_empty() || title.len() > 255 {
                return Err(AppError::Validation(
                    "Task title must be 1–255 characters".into(),
                ));
            }
        }
        validate_schedule(
            req.start_date.as_deref().or(card.start_date.as_deref()),
            req.due_date.as_deref().or(card.due_date.as_deref()),
        )?;
        if req
            .story_points
            .flatten()
            .is_some_and(|n| !n.is_finite() || n < 0.0)
            || req
                .estimated_hours
                .is_some_and(|n| !n.is_finite() || n < 0.0)
        {
            return Err(AppError::Validation(
                "Estimates must be non-negative numbers".into(),
            ));
        }
        CardRepository::update(
            &state.pool,
            id,
            req.title.as_deref(),
            req.description.as_deref().map(Some),
            req.priority.as_deref(),
            req.column_id.as_deref(),
            req.position,
            req.due_date
                .as_deref()
                .map(|d| if d.is_empty() { None } else { Some(d) }),
            req.start_date
                .as_deref()
                .map(|d| if d.is_empty() { None } else { Some(d) }),
            req.estimated_hours.map(Some),
            req.cover_url.as_deref().map(Some),
            req.is_template,
            req.story_points,
            &now,
        )
        .await?;

        if req
            .priority
            .as_deref()
            .is_some_and(|p| matches!(p, "urgent" | "high") && p != card.priority)
        {
            let notify_state = state.clone();
            let notify_project = project.id.clone();
            let title = format!("High-priority task: {}", card.title);
            tokio::spawn(async move {
                if let Err(error) = crate::features::integrations::service::notify(
                    &notify_state,
                    &notify_project,
                    &title,
                )
                .await
                {
                    tracing::warn!("Alert dispatch failed: {}", error);
                }
            });
        }
        crate::features::enterprise::operations::sync_resolution(&state.pool, id).await?;
        crate::features::productivity::repository::status(&state.pool,id).await?;
        if req.column_id.is_some() {
            crate::features::enterprise::automation::dispatch(
                state,
                &project.id,
                id,
                "card_moved",
                Some(user_id),
            )
            .await?;
        }
        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated card".to_string()))
    }

    pub async fn move_card(
        state: &AppState,
        id: &str,
        user_id: &str,
        req: MoveCardRequest,
    ) -> Result<(), AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, true, false)
            .await?;

        let now = Utc::now().to_rfc3339();
        crate::features::enterprise::operations::require_column(
            &state.pool,
            &project.id,
            &req.column_id,
        )
        .await?;
        crate::features::productivity::workflow::check(state,&project.id,id,&req.column_id,Some(user_id)).await?;
        CardRepository::move_card(&state.pool, id, &req.column_id, req.position, &now).await?;
        crate::features::productivity::repository::status(&state.pool,id).await?;
        crate::features::enterprise::automation::dispatch(
            state,
            &project.id,
            id,
            "card_moved",
            Some(user_id),
        )
        .await?;
        crate::features::enterprise::operations::sync_resolution(&state.pool, id).await?;
        crate::features::productivity::repository::status(&state.pool,id).await?;
        crate::features::enterprise::operations::snapshot_all(&state.pool).await?;
        Ok(())
    }

    pub async fn archive(
        state: &AppState,
        id: &str,
        user_id: &str,
        archive: bool,
    ) -> Result<(), AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, true, false)
            .await?;

        let now = if archive {
            Some(Utc::now().to_rfc3339())
        } else {
            None
        };
        CardRepository::archive(&state.pool, id, now.as_deref()).await
    }

    pub async fn delete(state: &AppState, id: &str, user_id: &str) -> Result<(), AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, true, false)
            .await?;

        CardRepository::archive(&state.pool, id, Some(&Utc::now().to_rfc3339())).await
    }

    pub async fn set_assignees(
        state: &AppState,
        id: &str,
        user_id: &str,
        assignee_ids: Vec<String>,
    ) -> Result<CardResponse, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, true, false)
            .await?;

        for assignee in &assignee_ids {
            crate::features::enterprise::operations::require_member(
                &state.pool,
                &project.id,
                assignee,
            )
            .await?;
        }
        let previous = CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .map(|c| {
                c.assignees
                    .into_iter()
                    .map(|a| a.user_id)
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        CardRepository::set_assignees(&state.pool, id, &assignee_ids).await?;
        let added = assignee_ids
            .iter()
            .filter(|id| !previous.contains(id))
            .cloned()
            .collect::<Vec<_>>();
        if let Err(error) = crate::features::enterprise::collaboration::assigned(
            state,
            user_id,
            id,
            &card.title,
            &added,
        )
        .await
        {
            tracing::warn!("Assignment notification failed: {}", error);
        }

        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated card".to_string()))
    }

    pub async fn set_labels(
        state: &AppState,
        id: &str,
        user_id: &str,
        label_ids: Vec<String>,
    ) -> Result<CardResponse, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, true, false)
            .await?;

        for label in &label_ids {
            crate::features::enterprise::operations::require_label(&state.pool, &project.id, label)
                .await?;
        }
        CardRepository::set_labels(&state.pool, id, &label_ids).await?;

        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated card".to_string()))
    }

    pub async fn toggle_watcher(
        state: &AppState,
        id: &str,
        user_id: &str,
    ) -> Result<CardResponse, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, false, false)
            .await?;

        let now = Utc::now().to_rfc3339();
        let _ = CardRepository::toggle_watcher(&state.pool, id, user_id, &now).await?;

        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated card".to_string()))
    }

    pub async fn list_watchers(
        state: &AppState,
        id: &str,
        user_id: &str,
    ) -> Result<Vec<crate::features::card::dto::CardWatcherResponse>, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, false, false)
            .await?;

        CardRepository::list_watchers(&state.pool, id).await
    }

    pub async fn toggle_vote(
        state: &AppState,
        id: &str,
        user_id: &str,
    ) -> Result<CardResponse, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, false, false)
            .await?;

        let now = Utc::now().to_rfc3339();
        let _ = CardRepository::toggle_vote(&state.pool, id, user_id, &now).await?;

        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated card".to_string()))
    }

    pub async fn add_link(
        state: &AppState,
        id: &str,
        user_id: &str,
        req: crate::features::card::dto::CreateCardLinkRequest,
    ) -> Result<(), AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, true, false)
            .await?;

        let target = CardRepository::find_by_id(&state.pool, &req.target_card_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Linked task not found".into()))?;
        let target_project = ProjectRepository::find_by_id(&state.pool, &target.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Linked project not found".into()))?;
        if target_project.workspace_id != project.workspace_id {
            return Err(AppError::Validation(
                "Linked task must belong to the same workspace".into(),
            ));
        }
        crate::features::enterprise::service::authorize(
            state,
            user_id,
            &target_project.id,
            false,
            false,
        )
        .await?;
        if id == req.target_card_id
            || !matches!(
                req.link_type.as_str(),
                "blocks" | "blocked_by" | "relates_to" | "duplicates" | "mirrors"
            )
        {
            return Err(AppError::Validation("Invalid task relationship".into()));
        }
        if req.link_type == "blocks" || req.link_type == "blocked_by" {
            let notify_state = state.clone();
            let notify_project = project.id.clone();
            let title = format!("Blocker linked: {}", card.title);
            tokio::spawn(async move {
                if let Err(error) = crate::features::integrations::service::notify(
                    &notify_state,
                    &notify_project,
                    &title,
                )
                .await
                {
                    tracing::warn!("Alert dispatch failed: {}", error);
                }
            });
        }
        let link_id = Uuid::now_v7().to_string();
        CardRepository::add_link(
            &state.pool,
            &link_id,
            id,
            &req.target_card_id,
            &req.link_type,
        )
        .await
    }

    pub async fn remove_link(
        state: &AppState,
        id: &str,
        link_id: &str,
        user_id: &str,
    ) -> Result<(), AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, true, false)
            .await?;

        if !CardRepository::list_links(&state.pool, id)
            .await?
            .iter()
            .any(|l| l.id == link_id)
        {
            return Err(AppError::NotFound(
                "Relationship not found on this task".into(),
            ));
        }
        CardRepository::remove_link(&state.pool, link_id).await
    }

    pub async fn list_links(
        state: &AppState,
        id: &str,
        user_id: &str,
    ) -> Result<Vec<crate::features::card::dto::CardLinkResponse>, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        crate::features::enterprise::service::authorize(state, user_id, &project.id, false, false)
            .await?;

        let links = CardRepository::list_links(&state.pool, id).await?;
        let mut visible = Vec::new();
        for link in links {
            if let Some(target) =
                CardRepository::find_by_id(&state.pool, &link.target_card_id).await?
            {
                if crate::features::enterprise::service::authorize(
                    state,
                    user_id,
                    &target.project_id,
                    false,
                    false,
                )
                .await
                .is_ok()
                {
                    visible.push(link);
                }
            }
        }
        Ok(visible)
    }
}

fn validate_schedule(start: Option<&str>, due: Option<&str>) -> Result<(), AppError> {
    for date in [start, due].into_iter().flatten().filter(|d| !d.is_empty()) {
        crate::features::enterprise::service::validate_date(date)?;
    }
    if let (Some(start), Some(due)) = (
        start.filter(|d| !d.is_empty()),
        due.filter(|d| !d.is_empty()),
    ) {
        if start.get(..10) > due.get(..10) {
            return Err(AppError::Validation(
                "Due date must be on or after the start date".into(),
            ));
        }
    }
    Ok(())
}
