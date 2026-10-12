use crate::state::AppState;
pub async fn start(s: AppState) -> Result<(), sqlx::Error> {
    let mut cursor = super::repository::event_cursor(&s.pool).await?;
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(std::time::Duration::from_millis(200));
        let mut cleanup = 0u32;
        loop {
            tick.tick().await;
            match super::repository::events(&s.pool, cursor).await {
                Ok(rows) => {
                    if rows.first().is_some_and(|(id, _, _)| *id > cursor + 1) {
                        let _ = s.changes.send(super::Change {
                            project_id: None,
                            user_id: None,
                            kind: "permissions_changed".into(),
                        });
                    }
                    for (id, origin, payload) in rows {
                        cursor = id;
                        if origin != s.instance_id {
                            if let Ok(change) = serde_json::from_str::<super::Change>(&payload) {
                                let _ = s.changes.send(change);
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Shared event polling failed: {e}");
                    let _ = s.changes.send(super::Change {
                        project_id: None,
                        user_id: None,
                        kind: "permissions_changed".into(),
                    });
                }
            }
            cleanup += 1;
            if cleanup >= 300 {
                cleanup = 0;
                if let Err(e) = super::repository::cleanup_events(&s.pool).await {
                    tracing::warn!("Event retention cleanup failed: {e}");
                }
            }
        }
    });
    Ok(())
}
