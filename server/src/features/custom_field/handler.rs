use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;

use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::custom_field::{
        dto::{
            CreateCustomFieldDefinitionRequest, CustomFieldDefinitionResponse,
            CustomFieldValueResponse, SetCustomFieldValueRequest,
        },
        service::CustomFieldService,
    },
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct ListDefinitionsQuery {
    pub project_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ListValuesQuery {
    pub card_id: String,
}

pub async fn list_definitions(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListDefinitionsQuery>,
) -> Result<Json<Vec<CustomFieldDefinitionResponse>>, AppError> {
    let defs = CustomFieldService::list_definitions(&state, &query.project_id, &auth.id).await?;
    Ok(Json(defs))
}

pub async fn create_definition(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateCustomFieldDefinitionRequest>,
) -> Result<Json<CustomFieldDefinitionResponse>, AppError> {
    let def = CustomFieldService::create_definition(&state, &auth.id, payload).await?;
    Ok(Json(def))
}

pub async fn delete_definition(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    CustomFieldService::delete_definition(&state, &auth.id, &id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn list_values(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListValuesQuery>,
) -> Result<Json<Vec<CustomFieldValueResponse>>, AppError> {
    let values = CustomFieldService::list_values(&state, &query.card_id, &auth.id).await?;
    Ok(Json(values))
}

pub async fn set_value(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<SetCustomFieldValueRequest>,
) -> Result<Json<Vec<CustomFieldValueResponse>>, AppError> {
    let values = CustomFieldService::set_value(&state, &auth.id, payload).await?;
    Ok(Json(values))
}
