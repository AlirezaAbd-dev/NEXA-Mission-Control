use crate::{error::AppError, extractors::auth::AuthUser, state::AppState};
use axum::{
    extract::{Path, Query, State},
    http::header,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
#[derive(Deserialize)]
pub struct ExportQuery {
    pub format: Option<String>,
}
pub async fn export(
    State(s): State<AppState>,
    a: AuthUser,
    Path(p): Path<String>,
    Query(q): Query<ExportQuery>,
) -> Result<Response, AppError> {
    super::service::authorize(&s, &a.id, &p, false, false).await?;
    let data = super::import_repository::export(&s.pool, &p, &a.id).await?;
    if q.format.as_deref() == Some("xlsx") {
        let rows = data
            .get("cards")
            .and_then(Value::as_array)
            .ok_or_else(|| AppError::Internal("Missing export tasks".into()))?;
        return Ok((
            [
                (
                    header::CONTENT_TYPE,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ),
                (
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=mission-control.xlsx",
                ),
            ],
            super::xlsx::export(rows),
        )
            .into_response());
    }
    if q.format.as_deref() == Some("csv") {
        let rows = data
            .get("cards")
            .and_then(Value::as_array)
            .ok_or_else(|| AppError::Internal("Export missing tasks".into()))?;
        let mut csv =
            String::from("ID,Title,Priority,Start date,Due date,Story points,Description\r\n");
        for row in rows {
            csv.push_str(
                &[
                    "id",
                    "title",
                    "priority",
                    "start_date",
                    "due_date",
                    "story_points",
                    "description",
                ]
                .map(|key| csv_cell(&row[key]))
                .join(","),
            );
            csv.push_str("\r\n");
        }
        return Ok((
            [
                (header::CONTENT_TYPE, "text/csv; charset=utf-8"),
                (
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=mission-control.csv",
                ),
            ],
            csv,
        )
            .into_response());
    }
    Ok((
        [(
            header::CONTENT_DISPOSITION,
            "attachment; filename=mission-control.json",
        )],
        Json(data),
    )
        .into_response())
}
fn csv_cell(v: &Value) -> String {
    let mut s = v.as_str().map(str::to_string).unwrap_or_else(|| {
        if v.is_null() {
            String::new()
        } else {
            v.to_string()
        }
    });
    if s.starts_with(['=', '+', '-', '@', '\t', '\r']) {
        s.insert(0, '\'');
    }
    format!("\"{}\"", s.replace('"', "\"\""))
}
#[derive(Deserialize)]
pub struct ImportRequest {
    pub format: String,
    pub data: Value,
}
#[derive(Serialize)]
pub struct ImportedCard {
    pub title: String,
    pub description: String,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
    pub priority: String,
    pub column: String,
    pub story_points: Option<f64>,
}
pub async fn handler(
    State(s): State<AppState>,
    a: AuthUser,
    Path(p): Path<String>,
    Json(r): Json<ImportRequest>,
) -> Result<Json<Value>, AppError> {
    super::service::authorize(&s, &a.id, &p, true, true).await?;
    let cards = normalize(&r)?;
    let n = super::import_repository::import(&s.pool, &p, &a.id, cards).await?;
    Ok(Json(json!({"imported":n})))
}
pub fn normalize(r: &ImportRequest) -> Result<Vec<ImportedCard>, AppError> {
    if !matches!(r.format.as_str(), "trello" | "mission-control") {
        return Err(AppError::Validation(
            "Choose Trello or Mission Control JSON".into(),
        ));
    }
    let cards = r.data["cards"]
        .as_array()
        .ok_or_else(|| AppError::Validation("JSON must contain a cards array".into()))?;
    if cards.len() > 5000 {
        return Err(AppError::Validation(
            "Import is limited to 5000 tasks".into(),
        ));
    }
    let mut result = Vec::new();
    for c in cards {
        if c["closed"].as_bool() == Some(true) {
            continue;
        }
        let title = if r.format == "trello" {
            c["name"].as_str()
        } else {
            c["title"].as_str()
        }
        .unwrap_or("");
        if title.trim().is_empty() || title.len() > 255 {
            return Err(AppError::Validation(
                "Every task needs a title of 1–255 characters".into(),
            ));
        }
        let column = if r.format == "trello" {
            r.data["lists"]
                .as_array()
                .and_then(|ls| ls.iter().find(|l| l["id"] == c["idList"]))
                .and_then(|l| l["name"].as_str())
                .unwrap_or("Imported")
        } else {
            r.data["columns"]
                .as_array()
                .and_then(|ls| ls.iter().find(|l| l["id"] == c["column_id"]))
                .and_then(|l| l["name"].as_str())
                .unwrap_or("Imported")
        };
        let priority = c["priority"].as_str().unwrap_or("no_priority");
        super::service::validate_priority(priority)?;
        let due_date = c[if r.format == "trello" {
            "due"
        } else {
            "due_date"
        }]
        .as_str()
        .map(str::to_string);
        if let Some(d) = &due_date {
            super::service::validate_date(d)?;
        }
        result.push(ImportedCard {
            title: title.into(),
            description: c[if r.format == "trello" {
                "desc"
            } else {
                "description"
            }]
            .as_str()
            .unwrap_or("")
            .into(),
            due_date,
            start_date: c["start_date"].as_str().map(str::to_string),
            priority: priority.into(),
            column: column.into(),
            story_points: c["story_points"].as_f64(),
        });
    }
    Ok(result)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn csv_blocks_formula() {
        assert_eq!(
            csv_cell(&json!("=HYPERLINK(\"x\")")),
            "\"'=HYPERLINK(\"\"x\"\")\""
        );
    }
    #[test]
    fn trello_maps_columns() {
        let r = ImportRequest {
            format: "trello".into(),
            data: json!({"lists":[{"id":"l","name":"Doing"}],"cards":[{"name":"Task","idList":"l"}]}),
        };
        let cards = normalize(&r).unwrap();
        assert_eq!(cards[0].column, "Doing");
    }
    #[test]
    fn rejects_empty_title() {
        assert!(normalize(&ImportRequest {
            format: "trello".into(),
            data: json!({"cards":[{"name":" "}]})
        })
        .is_err());
    }
}
