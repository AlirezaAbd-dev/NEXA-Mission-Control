use super::import::ImportedCard;
use crate::error::AppError;
use serde_json::{json, Value};
use sqlx::SqlitePool;
pub async fn export(pool: &SqlitePool, p: &str, user: &str) -> Result<Value, AppError> {
    let cards = crate::features::card::repository::CardRepository::list(
        pool,
        &crate::features::card::dto::ListCardsQuery {
            project_id: p.into(),
            column_id: None,
            search: None,
            priority: None,
            assignee_id: None,
            label_id: None,
            archived: Some(false),
        },
        Some(user),
    )
    .await?;
    let columns:Vec<(String,String,String)>=sqlx::query_as("SELECT c.id,c.name,c.type FROM columns c JOIN boards b ON b.id=c.board_id WHERE b.project_id=? ORDER BY position").bind(p).fetch_all(pool).await?;
    let admin = matches!(
        super::repository::role(pool, p, user).await?.as_deref(),
        Some("owner" | "admin")
    );
    let mut data = json!({"version":1,"exported_at":chrono::Utc::now().to_rfc3339(),"cards":cards,"columns":columns.into_iter().map(|(id,name,type_)|json!({"id":id,"name":name,"type":type_})).collect::<Vec<_>>(),"epics":super::repository::list(pool,p,user,"epics").await?,"releases":super::repository::list(pool,p,user,"releases").await?,"metadata":super::repository::list(pool,p,user,"metadata").await?});
    for (key,sql) in [
      ("checklists","SELECT cl.* FROM checklists cl JOIN cards c ON c.id=cl.card_id WHERE c.project_id=?"),
      ("checklist_items","SELECT i.* FROM checklist_items i JOIN checklists cl ON cl.id=i.checklist_id JOIN cards c ON c.id=cl.card_id WHERE c.project_id=?"),
      ("attachments","SELECT a.* FROM attachments a JOIN cards c ON c.id=a.card_id WHERE c.project_id=?"),
      ("custom_fields","SELECT * FROM custom_field_definitions WHERE project_id=?"),
      ("custom_field_values","SELECT v.* FROM custom_field_values v JOIN cards c ON c.id=v.card_id WHERE c.project_id=?"),
      ("card_links","SELECT l.* FROM card_links l JOIN cards c ON c.id=l.source_card_id WHERE c.project_id=?"),
      ("time_logs","SELECT t.* FROM time_logs t JOIN cards c ON c.id=t.card_id WHERE c.project_id=?"),
      ("sprints","SELECT * FROM sprints WHERE project_id=?"),
      ("sprint_cards","SELECT sc.* FROM sprint_cards sc JOIN sprints s ON s.id=sc.sprint_id WHERE s.project_id=?"),
      ("sprint_snapshots","SELECT ss.* FROM sprint_snapshots ss JOIN sprints s ON s.id=ss.sprint_id WHERE s.project_id=?"),
      ("documents","SELECT * FROM document_links WHERE project_id=?"),
      ("work_types","SELECT * FROM project_work_types WHERE project_id=?"),
      ("workflow_transitions","SELECT * FROM workflow_transitions WHERE project_id=?"),
      ("member_permissions","SELECT * FROM project_member_permissions WHERE project_id=?"),
      ("card_productivity","SELECT cp.* FROM card_productivity cp JOIN cards c ON c.id=cp.card_id WHERE c.project_id=?"),
      ("approvals","SELECT a.* FROM card_approvals a JOIN cards c ON c.id=a.card_id WHERE c.project_id=?"),
      ("status_history","SELECT * FROM card_status_history WHERE project_id=?"),
      ("development","SELECT d.* FROM development_links d JOIN cards c ON c.id=d.card_id WHERE c.project_id=?"),
    ] {data[key]=super::repository::export_rows(pool,sql,p).await?;}
    data["comments"]=super::repository::export_rows(pool,if admin{"SELECT x.* FROM comments x JOIN cards c ON c.id=x.card_id WHERE c.project_id=?"}else{"SELECT x.* FROM comments x JOIN cards c ON c.id=x.card_id WHERE c.project_id=? AND x.is_internal=0"},p).await?;
    data["mirrors"] = crate::features::productivity::repository::mirrors(pool, p, user).await?;
    if let Some(links) = data["card_links"].as_array() {
        let mut visible = Vec::new();
        for link in links {
            if let Some(target) = link["target_card_id"].as_str() {
                if let Some(project) =
                    super::access_repository::project_for(pool, "cards", target).await?
                {
                    if super::repository::role(pool, &project, user)
                        .await?
                        .is_some()
                    {
                        visible.push(link.clone());
                    }
                }
            }
        }
        data["card_links"] = json!(visible);
    }
    Ok(data)
}
pub async fn import(
    pool: &SqlitePool,
    p: &str,
    user: &str,
    cards: Vec<ImportedCard>,
) -> Result<usize, AppError> {
    let mut tx = pool.begin().await?;
    let board: String =
        sqlx::query_scalar("SELECT id FROM boards WHERE project_id=? ORDER BY created_at LIMIT 1")
            .bind(p)
            .fetch_one(&mut *tx)
            .await?;
    let now = chrono::Utc::now().to_rfc3339();
    let n = cards.len();
    for (i, c) in cards.into_iter().enumerate() {
        let column: Option<String> =
            sqlx::query_scalar("SELECT id FROM columns WHERE board_id=? AND name=?")
                .bind(&board)
                .bind(&c.column)
                .fetch_optional(&mut *tx)
                .await?;
        let column = match column {
            Some(id) => id,
            None => {
                let id = uuid::Uuid::now_v7().to_string();
                sqlx::query("INSERT INTO columns(id,board_id,name,type,position,created_at) VALUES(?,?,?,'active',?,?)").bind(&id).bind(&board).bind(&c.column).bind((i+1)as f64*1000.).bind(&now).execute(&mut *tx).await?;
                id
            }
        };
        let id = uuid::Uuid::now_v7().to_string();
        sqlx::query("INSERT INTO cards(id,project_id,column_id,title,description,priority,position,creator_id,due_date,start_date,story_points,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(&id).bind(p).bind(column).bind(c.title).bind(c.description).bind(c.priority).bind((i+1)as f64*1000.).bind(user).bind(c.due_date).bind(c.start_date).bind(c.story_points).bind(&now).bind(&now).execute(&mut *tx).await?;
        crate::features::productivity::repository::status_connection(&mut tx, &id).await?;
        super::repository::audit(
            &mut tx,
            p,
            Some(&id),
            Some(user),
            "imported_card",
            json!({}),
        )
        .await?;
    }
    tx.commit().await?;
    Ok(n)
}
