use anyhow::{anyhow, Context, Result};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, CONTENT_TYPE};
use serde_json::{json, Value};
use std::env;

#[derive(Clone)]
pub struct MissionControlClient {
    client: reqwest::Client,
    base_url: String,
}

impl MissionControlClient {
    pub fn new() -> Self {
        let base_url = env::var("MISSION_CONTROL_URL")
            .unwrap_or_else(|_| "https://tasks.nexasmart.net".to_string())
            .trim_end_matches('/')
            .to_string();

        let api_key = env::var("MISSION_CONTROL_API_KEY")
            .unwrap_or_default()
            .trim()
            .to_string();

        if api_key.is_empty() {
            eprintln!("[WARN] MISSION_CONTROL_API_KEY is not set. Unauthorized requests will fail.");
        }

        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        if !api_key.is_empty() {
            if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", api_key)) {
                headers.insert(AUTHORIZATION, val);
            }
        }

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .expect("Failed to initialize reqwest client");

        Self {
            client,
            base_url,
        }
    }

    async fn request(&self, method: reqwest::Method, endpoint: &str, body: Option<Value>) -> Result<Value> {
        let clean_endpoint = if endpoint.starts_with('/') {
            endpoint
        } else {
            &format!("/{}", endpoint)
        };
        let url = format!("{}/api/v1{}", self.base_url, clean_endpoint);

        let mut req = self.client.request(method, &url);
        if let Some(b) = body {
            req = req.json(&b);
        }

        let res = req.send().await.with_context(|| format!("Failed to connect to Mission Control at {}", url))?;
        let status = res.status();

        if status == reqwest::StatusCode::NO_CONTENT {
            return Ok(json!({}));
        }

        if !status.is_success() {
            let error_text = res.text().await.unwrap_or_default();
            let parsed_msg = if let Ok(val) = serde_json::from_str::<Value>(&error_text) {
                val.get("error")
                    .and_then(|e| e.get("message"))
                    .and_then(|m| m.as_str())
                    .or_else(|| val.get("message").and_then(|m| m.as_str()))
                    .map(|s| s.to_string())
                    .unwrap_or(error_text)
            } else {
                error_text
            };
            return Err(anyhow!("Mission Control API error ({}): {}", status, parsed_msg));
        }

        let data = res.json::<Value>().await.with_context(|| "Failed to parse API response as JSON")?;
        Ok(data)
    }

    pub async fn get_workspaces(&self) -> Result<Value> {
        self.request(reqwest::Method::GET, "/workspaces", None).await
    }

    pub async fn get_projects(&self, workspace_id: Option<&str>) -> Result<Value> {
        let endpoint = match workspace_id {
            Some(id) if !id.trim().is_empty() => format!("/projects?workspace_id={}", urlencoding::encode(id)),
            _ => "/projects".to_string(),
        };
        self.request(reqwest::Method::GET, &endpoint, None).await
    }

    pub async fn get_board(&self, project_id: &str) -> Result<Value> {
        let endpoint = format!("/boards/project/{}", urlencoding::encode(project_id));
        self.request(reqwest::Method::GET, &endpoint, None).await
    }

    pub async fn get_cards(&self, project_id: &str, column_id: Option<&str>) -> Result<Value> {
        let mut endpoint = format!("/cards?project_id={}", urlencoding::encode(project_id));
        if let Some(col) = column_id {
            if !col.trim().is_empty() {
                endpoint.push_str(&format!("&column_id={}", urlencoding::encode(col)));
            }
        }
        self.request(reqwest::Method::GET, &endpoint, None).await
    }

    pub async fn get_card(&self, card_id: &str) -> Result<Value> {
        let endpoint = format!("/cards/{}", urlencoding::encode(card_id));
        self.request(reqwest::Method::GET, &endpoint, None).await
    }

    pub async fn create_card(&self, payload: Value) -> Result<Value> {
        self.request(reqwest::Method::POST, "/cards", Some(payload)).await
    }

    pub async fn update_card(&self, card_id: &str, payload: Value) -> Result<Value> {
        let endpoint = format!("/cards/{}", urlencoding::encode(card_id));
        self.request(reqwest::Method::PUT, &endpoint, Some(payload)).await
    }

    pub async fn move_card(&self, card_id: &str, column_id: &str, position: Option<i64>) -> Result<Value> {
        let endpoint = format!("/cards/{}/move", urlencoding::encode(card_id));
        let body = json!({
            "column_id": column_id,
            "position": position.unwrap_or(65535),
        });
        self.request(reqwest::Method::POST, &endpoint, Some(body)).await
    }

    pub async fn get_comments(&self, card_id: &str) -> Result<Value> {
        let endpoint = format!("/comments?card_id={}", urlencoding::encode(card_id));
        self.request(reqwest::Method::GET, &endpoint, None).await
    }

    pub async fn add_comment(&self, card_id: &str, body: &str, is_internal: bool) -> Result<Value> {
        let payload = json!({
            "card_id": card_id,
            "body": body,
            "is_internal": is_internal,
        });
        self.request(reqwest::Method::POST, "/comments", Some(payload)).await
    }
}

// Minimal urlencoding helper to avoid heavy crate dependency
mod urlencoding {
    pub fn encode(data: &str) -> String {
        let mut encoded = String::with_capacity(data.len() * 3 / 2);
        for byte in data.bytes() {
            match byte {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    encoded.push(byte as char);
                }
                _ => {
                    encoded.push_str(&format!("%{:02X}", byte));
                }
            }
        }
        encoded
    }
}
