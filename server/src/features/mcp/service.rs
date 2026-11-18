use serde_json::{json, Value};
use crate::{
    error::AppError,
    features::{
        board::service::BoardService,
        card::{
            dto::{CreateCardRequest, ListCardsQuery, MoveCardRequest, UpdateCardRequest},
            repository::CardRepository,
            service::CardService,
        },
        comment::{dto::CreateCommentRequest, repository::CommentRepository, service::CommentService},
        mcp::tools,
        project::repository::ProjectRepository,
        workspace::repository::WorkspaceRepository,
    },
    state::AppState,
};

pub async fn handle_request(
    state: &AppState,
    user_id: &str,
    method: &str,
    params: &Value,
) -> Result<Value, AppError> {
    match method {
        "initialize" => Ok(json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "nexa-mission-control",
                "version": "1.0.0"
            }
        })),

        "ping" => Ok(json!({})),

        "tools/list" => Ok(json!({
            "tools": tools::get_tools()
        })),

        "tools/call" => {
            let tool_name = params
                .get("name")
                .and_then(|n| n.as_str())
                .unwrap_or_default();
            let args = params.get("arguments").cloned().unwrap_or(json!({}));

            let result = dispatch_tool(state, user_id, tool_name, &args).await;
            match result {
                Ok(content_text) => Ok(json!({
                    "content": [
                        {
                            "type": "text",
                            "text": content_text
                        }
                    ],
                    "isError": false
                })),
                Err(err) => Ok(json!({
                    "content": [
                        {
                            "type": "text",
                            "text": format!("Error executing {}: {}", tool_name, err)
                        }
                    ],
                    "isError": true
                })),
            }
        }

        unknown => Err(AppError::Validation(format!("Method not found: {}", unknown))),
    }
}

pub async fn dispatch_tool(
    state: &AppState,
    user_id: &str,
    name: &str,
    args: &Value,
) -> Result<String, AppError> {
    match name {
        "mc_list_workspaces" => {
            let workspaces = WorkspaceRepository::list_for_user(&state.pool, user_id).await?;
            Ok(serde_json::to_string_pretty(&workspaces).unwrap_or_default())
        }

        "mc_list_projects" => {
            let ws_id = args.get("workspace_id").and_then(|v| v.as_str());
            let projects = if let Some(wid) = ws_id {
                ProjectRepository::list_by_workspace(&state.pool, wid).await?
            } else {
                let workspaces = WorkspaceRepository::list_for_user(&state.pool, user_id).await?;
                let mut all_projects = Vec::new();
                for ws in workspaces {
                    if let Ok(p) = ProjectRepository::list_by_workspace(&state.pool, &ws.id).await {
                        all_projects.extend(p);
                    }
                }
                all_projects
            };
            Ok(serde_json::to_string_pretty(&projects).unwrap_or_default())
        }

        "mc_get_board" => {
            let project_id = args
                .get("project_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| AppError::Validation("Missing required argument 'project_id'".into()))?;
            let board = BoardService::get_by_project_id(state, project_id, user_id).await?;
            Ok(serde_json::to_string_pretty(&board).unwrap_or_default())
        }

        "mc_list_tasks" => {
            let project_id = args
                .get("project_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| AppError::Validation("Missing required argument 'project_id'".into()))?;
            let column_id = args.get("column_id").and_then(|v| v.as_str()).map(|s| s.to_string());
            let search = args.get("query").and_then(|v| v.as_str()).map(|s| s.to_string());

            let query = ListCardsQuery {
                project_id: project_id.to_string(),
                column_id,
                search,
                priority: None,
                assignee_id: None,
                label_id: None,
                archived: Some(false),
            };

            let cards = CardRepository::list(&state.pool, &query, Some(user_id)).await?;
            Ok(serde_json::to_string_pretty(&cards).unwrap_or_default())
        }

        "mc_get_task" => {
            let task_id = args
                .get("task_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| AppError::Validation("Missing required argument 'task_id'".into()))?;

            let card = CardRepository::get_card_response(&state.pool, task_id, Some(user_id)).await?;
            let comments = CommentRepository::list_by_card(&state.pool, task_id).await.unwrap_or_default();

            let mut card_json = serde_json::to_value(&card).map_err(|e| AppError::Internal(e.to_string()))?;
            if let Some(obj) = card_json.as_object_mut() {
                let comments_val = serde_json::to_value(comments).unwrap_or(json!([]));
                obj.insert("comments".to_string(), comments_val);
            }

            Ok(serde_json::to_string_pretty(&card_json).unwrap_or_default())
        }

        "mc_create_task" => {
            let project_id = args
                .get("project_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| AppError::Validation("Missing required argument 'project_id'".into()))?;
            let column_id = args
                .get("column_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| AppError::Validation("Missing required argument 'column_id'".into()))?;
            let title = args
                .get("title")
                .and_then(|v| v.as_str())
                .ok_or_else(|| AppError::Validation("Missing required argument 'title'".into()))?;

            let description = args.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());
            let priority = args.get("priority").and_then(|v| v.as_str()).map(|s| s.to_string());
            let due_date = args.get("due_date").and_then(|v| v.as_str()).map(|s| s.to_string());
            let story_points = args.get("story_points").and_then(|v| v.as_f64());

            let req = CreateCardRequest {
                project_id: project_id.to_string(),
                column_id: column_id.to_string(),
                title: title.to_string(),
                description,
                priority,
                position: None,
                due_date,
                start_date: None,
                estimated_hours: None,
                is_template: None,
                story_points,
                assignee_ids: None,
                label_ids: None,
            };

            let created = CardService::create(state, user_id, req).await?;
            Ok(format!("Task created successfully!\n\n{}", serde_json::to_string_pretty(&created).unwrap_or_default()))
        }

        "mc_update_task" => {
            let task_id = args
                .get("task_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| AppError::Validation("Missing required argument 'task_id'".into()))?;

            let title = args.get("title").and_then(|v| v.as_str()).map(|s| s.to_string());
            let description = args.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());
            let priority = args.get("priority").and_then(|v| v.as_str()).map(|s| s.to_string());
            let due_date = args.get("due_date").and_then(|v| v.as_str()).map(|s| s.to_string());

            let req = UpdateCardRequest {
                title,
                description,
                priority,
                column_id: None,
                position: None,
                due_date,
                start_date: None,
                estimated_hours: None,
                cover_url: None,
                is_template: None,
                story_points: None,
            };

            let updated = CardService::update(state, task_id, user_id, req).await?;
            Ok(format!("Task updated successfully!\n\n{}", serde_json::to_string_pretty(&updated).unwrap_or_default()))
        }

        "mc_move_task" => {
            let task_id = args
                .get("task_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| AppError::Validation("Missing required argument 'task_id'".into()))?;
            let target_column_id = args
                .get("target_column_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| AppError::Validation("Missing required argument 'target_column_id'".into()))?;

            let req = MoveCardRequest {
                column_id: target_column_id.to_string(),
                placement: None,
                position: 1000.0,
            };

            let moved = CardService::move_card(state, task_id, user_id, req).await?;
            Ok(format!("Task moved successfully!\n\n{}", serde_json::to_string_pretty(&moved).unwrap_or_default()))
        }

        "mc_add_comment" => {
            let task_id = args
                .get("task_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| AppError::Validation("Missing required argument 'task_id'".into()))?;
            let comment_body = args
                .get("comment")
                .and_then(|v| v.as_str())
                .ok_or_else(|| AppError::Validation("Missing required argument 'comment'".into()))?;

            let req = CreateCommentRequest {
                card_id: task_id.to_string(),
                is_internal: false,
                body: comment_body.to_string(),
            };

            let comment = CommentService::create(state, user_id, req).await?;
            Ok(format!("Comment added successfully!\n\n{}", serde_json::to_string_pretty(&comment).unwrap_or_default()))
        }

        unknown => Err(AppError::Validation(format!("Unknown tool: {}", unknown))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tools_list_has_all_expected_tools() {
        let tools = tools::get_tools();
        let arr = tools.as_array().expect("Tools must be an array");
        assert_eq!(arr.len(), 9);

        let names: Vec<&str> = arr
            .iter()
            .filter_map(|t| t.get("name").and_then(|n| n.as_str()))
            .collect();

        assert!(names.contains(&"mc_list_workspaces"));
        assert!(names.contains(&"mc_list_projects"));
        assert!(names.contains(&"mc_get_board"));
        assert!(names.contains(&"mc_list_tasks"));
        assert!(names.contains(&"mc_get_task"));
        assert!(names.contains(&"mc_create_task"));
        assert!(names.contains(&"mc_update_task"));
        assert!(names.contains(&"mc_move_task"));
        assert!(names.contains(&"mc_add_comment"));
    }
}
