use sqlx::SqlitePool;
use crate::{
    error::AppError,
    features::custom_field::{
        dto::{CustomFieldDefinitionResponse, CustomFieldValueResponse},
        models::CustomFieldDefinition,
    },
};

pub struct CustomFieldRepository;

impl CustomFieldRepository {
    pub async fn list_definitions_by_project(
        pool: &SqlitePool,
        project_id: &str,
    ) -> Result<Vec<CustomFieldDefinitionResponse>, AppError> {
        let defs = sqlx::query_as::<_, CustomFieldDefinition>(
            "SELECT id, project_id, name, field_type, options_json, position, created_at FROM custom_field_definitions WHERE project_id = ?1 ORDER BY position ASC, created_at ASC"
        )
        .bind(project_id)
        .fetch_all(pool)
        .await?;

        let results = defs
            .into_iter()
            .map(|d| {
                let options: Vec<String> = serde_json::from_str(&d.options_json).unwrap_or_default();
                CustomFieldDefinitionResponse {
                    id: d.id,
                    project_id: d.project_id,
                    name: d.name,
                    field_type: d.field_type,
                    options,
                    position: d.position,
                    created_at: d.created_at,
                }
            })
            .collect();

        Ok(results)
    }

    pub async fn find_definition_by_id(
        pool: &SqlitePool,
        id: &str,
    ) -> Result<Option<CustomFieldDefinition>, AppError> {
        let def = sqlx::query_as::<_, CustomFieldDefinition>(
            "SELECT id, project_id, name, field_type, options_json, position, created_at FROM custom_field_definitions WHERE id = ?1"
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(def)
    }

    pub async fn create_definition(
        pool: &SqlitePool,
        id: &str,
        project_id: &str,
        name: &str,
        field_type: &str,
        options_json: &str,
        position: f64,
        created_at: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO custom_field_definitions (id, project_id, name, field_type, options_json, position, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
        )
        .bind(id)
        .bind(project_id)
        .bind(name)
        .bind(field_type)
        .bind(options_json)
        .bind(position)
        .bind(created_at)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn delete_definition(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM custom_field_definitions WHERE id = ?1")
            .bind(id)
            .execute(pool)
            .await?;
        Ok(())
    }

    pub async fn list_values_by_card(
        pool: &SqlitePool,
        card_id: &str,
    ) -> Result<Vec<CustomFieldValueResponse>, AppError> {
        let rows = sqlx::query_as::<_, (String, String, String, String, String, String, Option<String>, Option<f64>, String)>(
            r#"
            SELECT v.id, v.card_id, v.field_id, d.name, d.field_type, d.options_json, v.value_text, v.value_number, v.updated_at
            FROM custom_field_values v
            INNER JOIN custom_field_definitions d ON v.field_id = d.id
            WHERE v.card_id = ?1
            ORDER BY d.position ASC
            "#
        )
        .bind(card_id)
        .fetch_all(pool)
        .await?;

        let results = rows
            .into_iter()
            .map(|(id, card_id, field_id, field_name, field_type, options_json, value_text, value_number, updated_at)| {
                let options: Vec<String> = serde_json::from_str(&options_json).unwrap_or_default();
                CustomFieldValueResponse {
                    id,
                    card_id,
                    field_id,
                    field_name,
                    field_type,
                    options,
                    value_text,
                    value_number,
                    updated_at,
                }
            })
            .collect();

        Ok(results)
    }

    pub async fn set_value(
        pool: &SqlitePool,
        id: &str,
        card_id: &str,
        field_id: &str,
        value_text: Option<&str>,
        value_number: Option<f64>,
        now: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO custom_field_values (id, card_id, field_id, value_text, value_number, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
            ON CONFLICT(card_id, field_id) DO UPDATE SET
                value_text = excluded.value_text,
                value_number = excluded.value_number,
                updated_at = excluded.updated_at
            "#
        )
        .bind(id)
        .bind(card_id)
        .bind(field_id)
        .bind(value_text)
        .bind(value_number)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(())
    }
}
