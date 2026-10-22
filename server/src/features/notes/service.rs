use super::{dto::*, repository as repo};
use crate::{error::AppError, state::AppState};
use validator::Validate;
async fn workspace_role(s: &AppState, u: &str, w: &str) -> Result<String, AppError> {
    crate::features::enterprise::access_repository::workspace_role(&s.pool, w, u)
        .await?
        .ok_or_else(|| AppError::Forbidden("Workspace access denied".into()))
}
pub async fn get(s: &AppState, u: &str, id: &str) -> Result<Note, AppError> {
    let mut n = repo::get(&s.pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound("Note not found".into()))?;
    if let Some(w) = &n.workspace_id {
        n.can_edit = workspace_role(s, u, w).await? != "viewer";
    } else if n.owner_id.as_deref() == Some(u) {
        n.can_edit = true;
    } else {
        return Err(AppError::NotFound("Note not found".into()));
    }
    Ok(n)
}
fn editable(n: &Note) -> Result<(), AppError> {
    if !n.can_edit {
        Err(AppError::Forbidden(
            "Your workspace role can read notes but cannot change them".into(),
        ))
    } else {
        Ok(())
    }
}
fn publish(s: &AppState, u: &str, workspace: Option<&str>) {
    if workspace.is_some() {
        s.publish(None, None, "workspace_changed");
    } else {
        s.publish(None, Some(u), "notes_changed");
    }
}
pub async fn list(s: &AppState, u: &str, r: ListNotes) -> Result<Vec<Note>, AppError> {
    let scope = r.scope.as_deref().unwrap_or("personal");
    let workspace = match scope {
        "personal" => {
            if r.workspace_id.is_some() {
                return Err(AppError::Validation(
                    "Personal notes do not belong to a workspace".into(),
                ));
            }
            None
        }
        "workspace" => Some(
            r.workspace_id
                .as_deref()
                .ok_or_else(|| AppError::Validation("Choose a workspace".into()))?,
        ),
        _ => return Err(AppError::Validation("Unknown note scope".into())),
    };
    if r.q.as_ref().is_some_and(|q| q.chars().count() > 200) {
        return Err(AppError::Validation(
            "Search must be at most 200 characters".into(),
        ));
    }
    let can_edit = if let Some(w) = workspace {
        workspace_role(s, u, w).await? != "viewer"
    } else {
        true
    };
    let mut notes = repo::list(
        &s.pool,
        u,
        workspace,
        r.q.as_deref(),
        r.trash.unwrap_or(false),
    )
    .await?;
    for n in &mut notes {
        n.can_edit = can_edit;
    }
    Ok(notes)
}
pub async fn create(s: &AppState, u: &str, mut r: CreateNote) -> Result<Note, AppError> {
    r.title = r.title.trim().into();
    r.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;
    if let Some(w) = &r.workspace_id {
        if workspace_role(s, u, w).await? == "viewer" {
            return Err(AppError::Forbidden(
                "Your workspace role cannot create shared notes".into(),
            ));
        }
    }
    let id = repo::create(&s.pool, u, &r).await?;
    publish(s, u, r.workspace_id.as_deref());
    get(s, u, &id).await
}
pub async fn update(s: &AppState, u: &str, id: &str, mut r: UpdateNote) -> Result<Note, AppError> {
    let n = get(s, u, id).await?;
    editable(&n)?;
    r.title = r.title.map(|v| v.trim().into());
    r.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;
    if n.deleted_at.is_some() && (r.body.is_some() || r.title.is_some() || r.pinned.is_some()) {
        return Err(AppError::Conflict(
            "Restore this note before editing it".into(),
        ));
    }
    repo::update(&s.pool, &n, &r).await?;
    publish(s, u, n.workspace_id.as_deref());
    get(s, u, id).await
}
pub async fn links(s: &AppState, u: &str, id: &str) -> Result<Vec<NoteLink>, AppError> {
    get(s, u, id).await?;
    repo::links(&s.pool, id, u).await
}
pub async fn link(
    s: &AppState,
    u: &str,
    id: &str,
    card: &str,
    remove: bool,
) -> Result<(), AppError> {
    let n = get(s, u, id).await?;
    editable(&n)?;
    if n.deleted_at.is_some() {
        return Err(AppError::Conflict(
            "Restore this note before editing links".into(),
        ));
    }
    if !remove {
        let task = crate::features::card::service::CardService::get_by_id(s, card, u).await?;
        if let Some(w) = &n.workspace_id {
            let project = crate::features::project::repository::ProjectRepository::find_by_id(
                &s.pool,
                &task.project_id,
            )
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".into()))?;
            if project.workspace_id != *w {
                return Err(AppError::Validation(
                    "Link a task from this workspace".into(),
                ));
            }
        }
    }
    repo::link(&s.pool, id, card, remove).await?;
    publish(s, u, n.workspace_id.as_deref());
    Ok(())
}
