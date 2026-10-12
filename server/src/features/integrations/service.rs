use super::repository as repo;
use crate::features::enterprise::dto::{ResourceRequest, TokenRequest};
use crate::{error::AppError, state::AppState};
use hmac::{Hmac, Mac};
use rand_core::{OsRng, RngCore};
use serde_json::{json, Value};
use sha2::Sha256;
use validator::Validate;
pub fn random_secret() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
pub fn validate(r: &ResourceRequest) -> Result<(), AppError> {
    let kind = r.kind.as_deref().unwrap_or("");
    if !matches!(kind, "github" | "gitlab" | "slack" | "discord" | "email") {
        return Err(AppError::Validation("Unsupported integration".into()));
    }
    if matches!(kind, "slack" | "discord") {
        validate_outbound(kind, r.config["url"].as_str().unwrap_or(""))?;
    } else if r.config["secret"].as_str().unwrap_or("").len() < 32 {
        return Err(AppError::Validation(
            "Use a webhook secret with at least 32 characters".into(),
        ));
    }
    if kind == "email" && r.config["owner_id"].as_str().unwrap_or("").is_empty() {
        return Err(AppError::Validation(
            "Email integration needs a workspace owner ID".into(),
        ));
    }
    Ok(())
}
pub fn validate_outbound(kind: &str, url: &str) -> Result<(), AppError> {
    let u =
        reqwest::Url::parse(url).map_err(|_| AppError::Validation("Invalid webhook URL".into()))?;
    let host = u.host_str().unwrap_or("");
    if u.scheme() != "https"
        || u.port().is_some()
        || !u.username().is_empty()
        || u.password().is_some()
        || !((kind == "slack" && host == "hooks.slack.com" && u.path().starts_with("/services/"))
            || (kind == "discord"
                && matches!(host, "discord.com" | "discordapp.com")
                && u.path().starts_with("/api/webhooks/")))
    {
        return Err(AppError::Validation(
            "Use an official Slack or Discord HTTPS webhook URL".into(),
        ));
    }
    Ok(())
}
pub async fn create_token(s: &AppState, user: &str, r: TokenRequest) -> Result<Value, AppError> {
    r.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;
    let id = uuid::Uuid::now_v7().to_string();
    let token = format!("mc_{}", random_secret());
    let expires = (chrono::Utc::now() + chrono::Duration::days(r.days)).to_rfc3339();
    repo::create_token(&s.pool, user, &id, &r.name, &token, &expires).await?;
    Ok(json!({"id":id,"token":token,"expires_at":expires}))
}
pub fn verify(secret: &str, body: &[u8], signature: &str) -> Result<(), AppError> {
    let value = signature.strip_prefix("sha256=").unwrap_or(signature);
    if value.len() != 64 || !value.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err(AppError::Unauthorized("Invalid webhook signature".into()));
    }
    let bytes = (0..64)
        .step_by(2)
        .map(|i| u8::from_str_radix(&value[i..i + 2], 16))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| AppError::Unauthorized("Invalid webhook signature".into()))?;
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
        .map_err(|_| AppError::Internal("Invalid HMAC key".into()))?;
    mac.update(body);
    mac.verify_slice(&bytes)
        .map_err(|_| AppError::Unauthorized("Webhook signature did not match".into()))
}
pub async fn webhook(
    s: &AppState,
    id: &str,
    kind: &str,
    body: &[u8],
    signature: &str,
    delivery: &str,
) -> Result<Value, AppError> {
    let (p, c) = repo::integration(&s.pool, id, kind).await?;
    let secret = c["secret"]
        .as_str()
        .ok_or_else(|| AppError::Internal("Missing webhook secret".into()))?;
    // GitHub signs the exact request body.
    verify(secret, body, signature)?;
    process_commits(s, id, &p, body, delivery).await
}
async fn process_commits(
    s: &AppState,
    id: &str,
    p: &str,
    body: &[u8],
    delivery: &str,
) -> Result<Value, AppError> {
    let v: Value = serde_json::from_slice(body)
        .map_err(|_| AppError::Validation("Invalid webhook JSON".into()))?;
    if delivery.is_empty() || delivery.len() > 200 {
        return Err(AppError::Validation("Delivery ID is required".into()));
    }
    if repo::seen_receipt(&s.pool, id, delivery).await? {
        return Ok(json!({"duplicate":true}));
    }
    let mut linked = super::development::ingest(s, id, p, &v).await?;
    if let Some(commits) = v["commits"].as_array() {
        for commit in commits.iter().take(100) {
            let message = commit["message"].as_str().unwrap_or("");
            let hash = commit["id"].as_str().unwrap_or("");
            for word in message.split_whitespace() {
                if let Some(key) = word
                    .trim_matches(|c: char| !c.is_ascii_alphanumeric() && c != '-')
                    .strip_prefix("CARD-")
                {
                    if key.len() >= 8
                        && repo::commit(&s.pool, &p, key, hash, message, message.contains("#done"))
                            .await?
                    {
                        linked += 1;
                    }
                }
            }
        }
    }
    repo::receipt(&s.pool, id, delivery).await?;
    s.publish(Some(p), None, "changed");
    Ok(json!({"linked":linked}))
}
pub async fn notify(s: &AppState, p: &str, title: &str) -> Result<(), AppError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    for (kind, url) in repo::outbound(&s.pool, p).await? {
        validate_outbound(&kind, &url)?;
        let body = if kind == "slack" {
            json!({"text":title})
        } else {
            json!({"content":title})
        };
        let result = client.post(url).json(&body).send().await;
        match result {
            Ok(response) if response.status().is_success() => {}
            _ => tracing::warn!("{} notification delivery failed", kind),
        }
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn webhook_rejects_unsigned() {
        assert!(verify("secret", b"{}", "bad").is_err());
    }
    #[test]
    fn outbound_blocks_ssrf() {
        assert!(validate_outbound("slack", "http://127.0.0.1:8000/").is_err());
        assert!(
            validate_outbound("slack", "https://hooks.slack.com.attacker.test/services/x").is_err()
        );
    }
    #[test]
    fn outbound_accepts_official() {
        assert!(validate_outbound("slack", "https://hooks.slack.com/services/x").is_ok());
    }
}

pub fn verify_gitlab(
    secret: &str,
    body: &[u8],
    id: &str,
    timestamp: &str,
    signatures: &str,
) -> Result<(), AppError> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    let time = timestamp
        .parse::<i64>()
        .map_err(|_| AppError::Unauthorized("Invalid webhook timestamp".into()))?;
    if (chrono::Utc::now().timestamp() as i128 - time as i128).abs() > 300 {
        return Err(AppError::Unauthorized("Webhook timestamp expired".into()));
    }
    let key = STANDARD
        .decode(secret.strip_prefix("whsec_").unwrap_or(secret))
        .map_err(|_| AppError::Validation("Invalid GitLab signing token".into()))?;
    let mut message = format!("{id}.{timestamp}.").into_bytes();
    message.extend_from_slice(body);
    for signature in signatures.split_whitespace() {
        let Some(value) = signature.strip_prefix("v1,") else {
            continue;
        };
        let Ok(bytes) = STANDARD.decode(value) else {
            continue;
        };
        let mut mac = Hmac::<Sha256>::new_from_slice(&key)
            .map_err(|_| AppError::Validation("Invalid signing token".into()))?;
        mac.update(&message);
        if mac.verify_slice(&bytes).is_ok() {
            return Ok(());
        }
    }
    Err(AppError::Unauthorized(
        "GitLab signature did not match".into(),
    ))
}
pub async fn gitlab_webhook(
    s: &AppState,
    id: &str,
    body: &[u8],
    delivery: &str,
    timestamp: &str,
    signature: &str,
) -> Result<Value, AppError> {
    let (p, c) = repo::integration(&s.pool, id, "gitlab").await?;
    verify_gitlab(
        c["secret"].as_str().unwrap_or(""),
        body,
        delivery,
        timestamp,
        signature,
    )?;
    process_commits(s, id, &p, body, delivery).await
}

pub async fn tokens(s: &AppState, user: &str) -> Result<Value, AppError> {
    repo::tokens(&s.pool, user).await
}
pub async fn revoke(s: &AppState, user: &str, id: &str) -> Result<(), AppError> {
    repo::revoke(&s.pool, user, id).await
}
#[derive(serde::Deserialize)]
struct MailPayload {
    subject: String,
    text: Option<String>,
    from: String,
}
pub async fn email(
    s: &AppState,
    id: &str,
    body: &[u8],
    signature: &str,
    delivery: &str,
) -> Result<Value, AppError> {
    let (p, c) = repo::integration(&s.pool, id, "email").await?;
    verify(c["secret"].as_str().unwrap_or(""), body, signature)?;
    let v: MailPayload = serde_json::from_slice(body)
        .map_err(|_| AppError::Validation("Invalid email payload".into()))?;
    if delivery.is_empty() || delivery.len() > 200 {
        return Err(AppError::Validation(
            "X-Mission-Delivery must contain a unique message ID".into(),
        ));
    }
    if v.subject.trim().is_empty() || v.subject.len() > 255 || v.from.len() > 320 {
        return Err(AppError::Validation(
            "Invalid email subject or sender".into(),
        ));
    }
    let user = c["owner_id"]
        .as_str()
        .ok_or_else(|| AppError::Validation("Missing mailbox owner".into()))?;
    crate::features::enterprise::service::authorize(s, user, &p, true, true).await?;
    let column = c["column_id"]
        .as_str()
        .ok_or_else(|| AppError::Validation("Missing email target column".into()))?;
    crate::features::enterprise::operations::require_column(&s.pool, &p, column).await?;
    let description = format!("From: {}\n\n{}", v.from, v.text.unwrap_or_default());
    let card = repo::mail_card(
        &s.pool,
        &p,
        user,
        column,
        &v.subject,
        &description,
        id,
        delivery,
    )
    .await?;
    if let Some(card) = card {
        s.publish(Some(&p), None, "changed");
        crate::features::enterprise::automation::dispatch(s, &p, &card, "card_created", Some(user))
            .await?;
        Ok(json!({"id":card}))
    } else {
        Ok(json!({"duplicate":true}))
    }
}
