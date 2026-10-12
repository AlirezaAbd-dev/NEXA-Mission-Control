use crate::error::AppError;
use serde_json::Value;
use sqlx::SqlitePool;
pub async fn task_snapshot(pool: &SqlitePool, id: &str) -> Result<Option<Value>, AppError> {
    let mut conn = pool.acquire().await?;
    task_snapshot_connection(&mut conn, id).await
}
pub async fn task_snapshot_connection(
    conn: &mut sqlx::SqliteConnection,
    id: &str,
) -> Result<Option<Value>, AppError> {
    let row:Option<String>=sqlx::query_scalar(r#"
 SELECT json_object(
 'title',c.title,'description',c.description,'status',col.name,'priority',c.priority,
 'story_points',c.story_points,'estimated_hours',c.estimated_hours,'start_date',c.start_date,'due_date',c.due_date,
 'archived',c.archived_at IS NOT NULL,'position',c.position,'cover',c.cover_url,
 'epic',e.name,'parent_task',parent.title,'release',r.name,'response_sla',c.sla_response_due_at,'resolution_sla',c.sla_due_at,
 'assignees',json(COALESCE((SELECT json_group_array(display_name) FROM(SELECT u.display_name FROM card_assignees a JOIN users u ON u.id=a.user_id WHERE a.card_id=c.id ORDER BY u.id)),'[]')),
 'labels',json(COALESCE((SELECT json_group_array(name) FROM(SELECT l.name FROM card_labels a JOIN labels l ON l.id=a.label_id WHERE a.card_id=c.id ORDER BY l.id)),'[]')),
 'checklists',json(COALESCE((SELECT json_group_array(cl.title) FROM checklists cl WHERE cl.card_id=c.id ORDER BY cl.id),'[]')),
 'checklist_items',json(COALESCE((SELECT json_group_array(json_object('title',i.title,'completed',i.is_done,'due_date',i.due_date,'assignee',u.display_name)) FROM checklist_items i JOIN checklists cl ON cl.id=i.checklist_id LEFT JOIN users u ON u.id=i.assignee_id WHERE cl.card_id=c.id ORDER BY i.id),'[]')),
 'work_type',wt.name,'repeat_days',cp.repeat_days,'reminder_minutes',cp.reminder_minutes,
 'custom_fields',json(COALESCE((SELECT json_group_array(json_object('name',f.name,'value',COALESCE(v.value_text,v.value_number))) FROM custom_field_values v JOIN custom_field_definitions f ON f.id=v.field_id WHERE v.card_id=c.id ORDER BY f.id),'[]')),
 'public_comments',(SELECT count(*) FROM comments WHERE card_id=c.id AND is_internal=0),
 'logged_minutes',COALESCE((SELECT sum(minutes) FROM time_logs WHERE card_id=c.id),0),
 'attachments',json(COALESCE((SELECT json_group_array(filename) FROM attachments WHERE card_id=c.id ORDER BY id),'[]'))
 ) FROM cards c JOIN columns col ON col.id=c.column_id LEFT JOIN epics e ON e.id=c.epic_id LEFT JOIN cards parent ON parent.id=c.parent_id LEFT JOIN releases r ON r.id=c.release_id LEFT JOIN card_productivity cp ON cp.card_id=c.id LEFT JOIN project_work_types wt ON wt.id=cp.work_type_id WHERE c.id=?
 "#).bind(id).fetch_optional(&mut *conn).await?;
    row.map(|v| {
        serde_json::from_str(&v).map_err(|_| AppError::Internal("Invalid audit snapshot".into()))
    })
    .transpose()
}
pub fn changes(before: &Value, after: &Value) -> Value {
    let mut result = serde_json::Map::new();
    if let (Some(old), Some(new)) = (before.as_object(), after.as_object()) {
        for (key, value) in new {
            if old.get(key) != Some(value) {
                result.insert(key.clone(),serde_json::json!({"before":old.get(key).unwrap_or(&Value::Null),"after":value}));
            }
        }
    }
    Value::Object(result)
}
