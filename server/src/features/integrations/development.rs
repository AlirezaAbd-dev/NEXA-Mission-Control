use crate::{error::AppError, state::AppState};
use serde_json::Value;
pub async fn ingest(
    s: &AppState,
    integration: &str,
    p: &str,
    payload: &Value,
) -> Result<usize, AppError> {
    let event = if let Some(pr) = payload.get("pull_request") {
        Some((
            "pull_request",
            pr,
            format!(
                "{} {} {}",
                pr["title"].as_str().unwrap_or(""),
                pr["body"].as_str().unwrap_or(""),
                pr["head"]["ref"].as_str().unwrap_or("")
            ),
        ))
    } else if let Some(run) = payload.get("workflow_run") {
        Some((
            "build",
            run,
            format!(
                "{} {}",
                run["head_branch"].as_str().unwrap_or(""),
                run["head_commit"]["message"].as_str().unwrap_or("")
            ),
        ))
    } else if let Some(deployment) = payload.get("deployment") {
        Some((
            "deployment",
            deployment,
            format!(
                "{} {}",
                deployment["ref"].as_str().unwrap_or(""),
                deployment["description"].as_str().unwrap_or("")
            ),
        ))
    } else if matches!(
        payload["object_kind"].as_str(),
        Some("merge_request" | "pipeline")
    ) {
        let attrs = &payload["object_attributes"];
        Some((
            if payload["object_kind"] == "merge_request" {
                "merge_request"
            } else {
                "build"
            },
            attrs,
            format!(
                "{} {} {} {}",
                attrs["title"].as_str().unwrap_or(""),
                attrs["description"].as_str().unwrap_or(""),
                attrs["source_branch"].as_str().unwrap_or(""),
                payload["commit"]["message"].as_str().unwrap_or("")
            ),
        ))
    } else {
        None
    };
    let Some((kind, object, text)) = event else {
        return Ok(0);
    };
    let url = payload["deployment_status"]["environment_url"]
        .as_str()
        .or_else(|| payload["deployment_status"]["target_url"].as_str())
        .or_else(|| object["html_url"].as_str())
        .or_else(|| object["url"].as_str())
        .unwrap_or("");
    let Ok(parsed) = reqwest::Url::parse(url) else {
        return Ok(0);
    };
    if parsed.scheme() != "https" || !parsed.username().is_empty() || parsed.password().is_some() {
        return Ok(0);
    }
    let external = object["id"]
        .as_i64()
        .map(|n| n.to_string())
        .or_else(|| object["id"].as_str().map(str::to_owned))
        .unwrap_or_default();
    if external.is_empty() {
        return Ok(0);
    }
    let title = object["title"]
        .as_str()
        .or_else(|| object["name"].as_str())
        .unwrap_or(kind);
    let title = title.chars().take(255).collect::<String>();
    let state = if object["merged"] == true {
        "merged"
    } else {
        payload["deployment_status"]["state"]
            .as_str()
            .or_else(|| object["conclusion"].as_str())
            .or_else(|| object["state"].as_str())
            .or_else(|| object["status"].as_str())
            .unwrap_or("unknown")
    };
    let mut linked = 0;
    for part in text.split("CARD-").skip(1).take(20) {
        let key = part
            .chars()
            .take_while(|c| c.is_ascii_hexdigit() || *c == '-')
            .take(36)
            .collect::<String>();
        if key.len() < 8 {
            continue;
        }
        if let Some(card) = super::repository::resolve_card(&s.pool, p, &key).await? {
            super::repository::development_link(
                &s.pool,
                &card,
                integration,
                kind,
                &external,
                &title,
                url,
                state,
            )
            .await?;
            linked += 1;
        }
    }
    Ok(linked)
}
