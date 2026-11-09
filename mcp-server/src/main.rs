mod api;
mod tools;

use anyhow::Result;
use api::MissionControlClient;
use serde_json::{json, Value};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

#[tokio::main]
async fn main() -> Result<()> {
    eprintln!("NEXA Mission Control MCP Server (Rust) running on stdio");

    let client = MissionControlClient::new();
    let stdin = tokio::io::stdin();
    let mut reader = BufReader::new(stdin).lines();
    let mut stdout = tokio::io::stdout();

    while let Some(line) = reader.next_line().await? {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let parsed: Value = match serde_json::from_str(trimmed) {
            Ok(val) => val,
            Err(err) => {
                eprintln!("[WARN] Failed to parse input JSON: {}", err);
                continue;
            }
        };

        let id = parsed.get("id").cloned();
        let method = parsed.get("method").and_then(|m| m.as_str()).unwrap_or_default();
        let params = parsed.get("params").cloned().unwrap_or(json!({}));

        // Notifications don't have an ID and expect no response
        let is_notification = id.is_none();

        let response_result = handle_request(&client, method, &params).await;

        if is_notification {
            continue;
        }

        let req_id = id.unwrap_or(Value::Null);

        let json_rpc_resp = match response_result {
            Ok(result) => json!({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": result
            }),
            Err(err) => json!({
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32603,
                    "message": err.to_string()
                }
            }),
        };

        let mut output = serde_json::to_string(&json_rpc_resp)?;
        output.push('\n');
        stdout.write_all(output.as_bytes()).await?;
        stdout.flush().await?;
    }

    Ok(())
}

async fn handle_request(client: &MissionControlClient, method: &str, params: &Value) -> Result<Value> {
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

            let result = dispatch_tool(client, tool_name, &args).await;
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

        unknown => Err(anyhow::anyhow!("Method not found: {}", unknown)),
    }
}

async fn dispatch_tool(client: &MissionControlClient, name: &str, args: &Value) -> Result<String> {
    match name {
        "mc_list_workspaces" => {
            let res = client.get_workspaces().await?;
            Ok(serde_json::to_string_pretty(&res)?)
        }

        "mc_list_projects" => {
            let ws_id = args.get("workspace_id").and_then(|v| v.as_str());
            let res = client.get_projects(ws_id).await?;
            Ok(serde_json::to_string_pretty(&res)?)
        }

        "mc_get_board" => {
            let project_id = args
                .get("project_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing required argument 'project_id'"))?;
            let res = client.get_board(project_id).await?;
            Ok(serde_json::to_string_pretty(&res)?)
        }

        "mc_list_tasks" => {
            let project_id = args
                .get("project_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing required argument 'project_id'"))?;
            let column_id = args.get("column_id").and_then(|v| v.as_str());
            let query = args.get("query").and_then(|v| v.as_str()).map(|q| q.to_lowercase());

            let raw_cards = client.get_cards(project_id, column_id).await?;
            if let Some(cards_array) = raw_cards.as_array() {
                if let Some(q) = query {
                    let filtered: Vec<&Value> = cards_array
                        .iter()
                        .filter(|card| {
                            let title = card.get("title").and_then(|t| t.as_str()).unwrap_or_default().to_lowercase();
                            let desc = card.get("description").and_then(|d| d.as_str()).unwrap_or_default().to_lowercase();
                            title.contains(&q) || desc.contains(&q)
                        })
                        .collect();
                    Ok(serde_json::to_string_pretty(&filtered)?)
                } else {
                    Ok(serde_json::to_string_pretty(&cards_array)?)
                }
            } else {
                Ok(serde_json::to_string_pretty(&raw_cards)?)
            }
        }

        "mc_get_task" => {
            let task_id = args
                .get("task_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing required argument 'task_id'"))?;

            let mut card = client.get_card(task_id).await?;
            let comments = client.get_comments(task_id).await.unwrap_or(json!([]));

            if let Some(obj) = card.as_object_mut() {
                obj.insert("comments".to_string(), comments);
            }

            Ok(serde_json::to_string_pretty(&card)?)
        }

        "mc_create_task" => {
            let project_id = args
                .get("project_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing required argument 'project_id'"))?;
            let column_id = args
                .get("column_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing required argument 'column_id'"))?;
            let title = args
                .get("title")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing required argument 'title'"))?;

            let mut payload = json!({
                "project_id": project_id,
                "column_id": column_id,
                "title": title
            });

            if let Some(desc) = args.get("description").and_then(|v| v.as_str()) {
                payload["description"] = json!(desc);
            }
            if let Some(prio) = args.get("priority").and_then(|v| v.as_str()) {
                payload["priority"] = json!(prio);
            }
            if let Some(due) = args.get("due_date").and_then(|v| v.as_str()) {
                payload["due_date"] = json!(due);
            }
            if let Some(pts) = args.get("story_points").and_then(|v| v.as_f64()) {
                payload["story_points"] = json!(pts);
            }

            let card = client.create_card(payload).await?;
            Ok(format!("Task created successfully!\n\n{}", serde_json::to_string_pretty(&card)?))
        }

        "mc_update_task" => {
            let task_id = args
                .get("task_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing required argument 'task_id'"))?;

            let mut payload = json!({});
            if let Some(title) = args.get("title").and_then(|v| v.as_str()) {
                payload["title"] = json!(title);
            }
            if let Some(desc) = args.get("description").and_then(|v| v.as_str()) {
                payload["description"] = json!(desc);
            }
            if let Some(prio) = args.get("priority").and_then(|v| v.as_str()) {
                payload["priority"] = json!(prio);
            }
            if let Some(due) = args.get("due_date").and_then(|v| v.as_str()) {
                payload["due_date"] = json!(due);
            }

            let updated = client.update_card(task_id, payload).await?;
            Ok(format!("Task updated successfully!\n\n{}", serde_json::to_string_pretty(&updated)?))
        }

        "mc_move_task" => {
            let task_id = args
                .get("task_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing required argument 'task_id'"))?;
            let target_column_id = args
                .get("target_column_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing required argument 'target_column_id'"))?;

            let moved = client.move_card(task_id, target_column_id, None).await?;
            Ok(format!(
                "Task {} successfully moved to column {}!\n\n{}",
                task_id,
                target_column_id,
                serde_json::to_string_pretty(&moved)?
            ))
        }

        "mc_add_comment" => {
            let task_id = args
                .get("task_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing required argument 'task_id'"))?;
            let comment = args
                .get("comment")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing required argument 'comment'"))?;

            let result = client.add_comment(task_id, comment, false).await?;
            Ok(format!(
                "Comment added to task {} successfully!\n\n{}",
                task_id,
                serde_json::to_string_pretty(&result)?
            ))
        }

        unknown => Err(anyhow::anyhow!("Unknown tool: {}", unknown)),
    }
}
