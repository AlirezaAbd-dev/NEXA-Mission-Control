use crate::{error::AppError, state::AppState};
use serde_json::json;
pub async fn comment_notifications(
    s: &AppState,
    actor: &str,
    card: &str,
    title: &str,
    body: &str,
    internal: bool,
) -> Result<(), AppError> {
    let mentions: std::collections::HashSet<String> = body
        .split_whitespace()
        .filter_map(|word| {
            word.trim_matches(|c: char| {
                matches!(c, ',' | ':' | ';' | '!' | '?' | '(' | ')' | '[' | ']')
            })
            .strip_prefix('@')
            .map(str::to_lowercase)
        })
        .collect();
    let recipients = super::collaboration_repository::recipients(&s.pool, card).await?;
    let mut items = Vec::new();
    for (user, username, watched, role) in recipients {
        if user == actor || internal && !matches!(role.as_str(), "owner" | "admin") {
            continue;
        }
        let mentioned = mentions.contains(&username.to_lowercase());
        if mentioned || watched {
            items.push((user,if mentioned{"mentioned"}else{"watched_comment"}.to_string(),json!({"message":if mentioned{format!("You were mentioned in {title}")}else{format!("New comment on {title}")},"card_id":card,"actor_id":actor})));
        }
    }
    super::collaboration_repository::notify(&s.pool, items).await
}
pub async fn assigned(
    s: &AppState,
    actor: &str,
    card: &str,
    title: &str,
    assignees: &[String],
) -> Result<(), AppError> {
    let items=assignees.iter().filter(|id|id.as_str()!=actor).map(|id|(id.clone(),"assigned".into(),json!({"message":format!("You were assigned to {title}"),"card_id":card,"actor_id":actor}))).collect();
    super::collaboration_repository::notify(&s.pool, items).await
}
