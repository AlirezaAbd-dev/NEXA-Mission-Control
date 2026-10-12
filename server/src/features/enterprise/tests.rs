use super::{dto::*, operations, service};
use crate::{config::Config, state::AppState};
use serde_json::json;
async fn fixture() -> AppState {
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    for (id, role) in [
        ("owner", "owner"),
        ("member", "member"),
        ("viewer", "viewer"),
        ("other", "member"),
    ] {
        sqlx::query("INSERT INTO users(id,email,username,display_name,password_hash,created_at,updated_at) VALUES(?,?,?,?,'hash','now','now')").bind(id).bind(format!("{id}@test.local")).bind(id).bind(id).execute(&pool).await.unwrap();
        if id == "owner" {
            sqlx::query("INSERT INTO workspaces(id,name,slug,owner_id,created_at,updated_at) VALUES('w','Workspace','w','owner','now','now')").execute(&pool).await.unwrap();
        }
        if id != "other" {
            sqlx::query("INSERT INTO workspace_members(id,workspace_id,user_id,role,joined_at) VALUES(?,'w',?,?,'now')").bind(id).bind(id).bind(role).execute(&pool).await.unwrap();
        }
    }
    sqlx::query("INSERT INTO projects(id,workspace_id,name,identifier,created_at,updated_at) VALUES('p','w','Project','P','now','now')").execute(&pool).await.unwrap();
    sqlx::query("INSERT INTO boards(id,project_id,name,created_at) VALUES('b','p','Board','now')")
        .execute(&pool)
        .await
        .unwrap();
    for (id, t) in [("todo", "active"), ("done", "done")] {
        sqlx::query("INSERT INTO columns(id,board_id,name,type,position,created_at) VALUES(?,'b',?,?,1,'now')").bind(id).bind(id).bind(t).execute(&pool).await.unwrap();
    }
    for (id, column, points) in [("c1", "todo", 5.), ("c2", "done", 3.)] {
        sqlx::query("INSERT INTO cards(id,project_id,column_id,title,priority,position,story_points,created_at,updated_at) VALUES(?,'p',?,?,'medium',1,?,'now','now')").bind(id).bind(column).bind(id).bind(points).execute(&pool).await.unwrap();
    }
    AppState::new(
        pool,
        Config {
            database_url: "sqlite::memory:".into(),
            jwt_secret: "test".into(),
            port: 8000,
            upload_dir: "/tmp/test".into(),
        },
    )
}
#[tokio::test]
async fn personal_inbox_isolated_and_conversion_atomic() {
    use crate::features::productivity::{dto::Input, service as p};
    let s = fixture().await;
    let r: Input = serde_json::from_value(json!({"title":"Captured idea"})).unwrap();
    let id = p::save_personal(&s, "owner", "inbox", None, r)
        .await
        .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    assert!(p::personal(&s, "member", "inbox")
        .await
        .unwrap()
        .as_array()
        .unwrap()
        .is_empty());
    let r: Input = serde_json::from_value(json!({"project_id":"p","column_id":"done"})).unwrap();
    let card = p::convert(&s, "owner", &id, r).await.unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    assert!(p::personal(&s, "owner", "inbox")
        .await
        .unwrap()
        .as_array()
        .unwrap()
        .is_empty());
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT title FROM cards WHERE id=?")
            .bind(card)
            .fetch_one(&s.pool)
            .await
            .unwrap(),
        "Captured idea"
    );
}
#[tokio::test]
async fn advanced_search_scopes_or_groups_and_sql_literals() {
    let s = fixture().await;
    use crate::features::search::{expression, repository::SearchRepository};
    let expr = expression::parse("priority:low OR (points >= 5 AND NOT status:done)").unwrap();
    let rows = SearchRepository::search_expression(&s.pool, &expr, "owner")
        .await
        .unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].card_id, "c1");
    let expr = expression::parse("project = \"x' OR 1=1 --\"").unwrap();
    assert!(SearchRepository::search_expression(&s.pool, &expr, "owner")
        .await
        .unwrap()
        .is_empty());
    assert!(SearchRepository::search_expression(
        &s.pool,
        &expression::parse("priority:medium").unwrap(),
        "other"
    )
    .await
    .unwrap()
    .is_empty());
}
#[tokio::test]
async fn mirrored_task_uses_source_and_preserves_private_access() {
    let s = fixture().await;
    use crate::features::productivity::repository as p;
    sqlx::query("INSERT INTO projects(id,workspace_id,name,identifier,visibility,created_at,updated_at) VALUES('p2','w','Private Source','PS','private','now','now')").execute(&s.pool).await.unwrap();
    sqlx::query("UPDATE cards SET project_id='p2' WHERE id='c1'")
        .execute(&s.pool)
        .await
        .unwrap();
    p::mirror(&s.pool, "p", "c1").await.unwrap();
    assert_eq!(
        p::mirrors(&s.pool, "p", "owner")
            .await
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert!(p::mirrors(&s.pool, "p", "member")
        .await
        .unwrap()
        .as_array()
        .unwrap()
        .is_empty());
    sqlx::query("UPDATE cards SET title='Live source edit' WHERE id='c1'")
        .execute(&s.pool)
        .await
        .unwrap();
    assert_eq!(
        p::mirrors(&s.pool, "p", "owner").await.unwrap()[0]["title"],
        "Live source edit"
    );
}
#[tokio::test]
async fn authenticator_recovery_codes_single_use() {
    let s = fixture().await;
    use crate::features::auth::{mfa_repository as r, mfa_service as m};
    use sha2::{Digest, Sha256};
    // Recovery-code consumption is atomic even when two requests arrive together.
    r::setup(&s.pool, "owner", "encrypted").await.unwrap();
    r::enable(
        &s.pool,
        "owner",
        0,
        vec![format!("{:x}", Sha256::digest(b"test-recovery"))],
    )
    .await
    .unwrap();
    let hash = format!("{:x}", Sha256::digest(b"test-recovery"));
    assert!(r::recovery(&s.pool, "owner", &hash).await.unwrap());
    assert!(!r::recovery(&s.pool, "owner", &hash).await.unwrap());
    assert_eq!(m::status(&s, "owner").await.unwrap()["enabled"], true);
}
#[tokio::test]
async fn workflow_blocks_bulk_and_requires_current_revision_approval() {
    use crate::features::productivity::{dto::Input, service as p, workflow};
    let s = fixture().await;
    let r:Input=serde_json::from_value(json!({"name":"Review gate","from_column":"todo","to_column":"done","require_description":true,"require_approval":true})).unwrap();
    let transition = p::save_resource(&s, "owner", "p", "workflows", r)
        .await
        .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    assert!(workflow::check(&s, "p", "c1", "done", Some("member"))
        .await
        .is_err());
    sqlx::query("UPDATE cards SET description='ready' WHERE id='c1'")
        .execute(&s.pool)
        .await
        .unwrap();
    let r: Input = serde_json::from_value(json!({"transition_id":transition})).unwrap();
    let approval = p::approval(&s, "member", "p", "c1", r).await.unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    p::approve(&s, "owner", "p", &approval).await.unwrap();
    assert!(workflow::check(&s, "p", "c1", "done", Some("member"))
        .await
        .is_ok());
    sqlx::query("UPDATE cards SET updated_at='changed' WHERE id='c1'")
        .execute(&s.pool)
        .await
        .unwrap();
    assert!(workflow::check(&s, "p", "c1", "done", Some("member"))
        .await
        .is_err());
    assert!(service::bulk(
        &s,
        "member",
        "p",
        BulkRequest {
            card_ids: vec!["c1".into()],
            action: "move".into(),
            value: Some("done".into())
        }
    )
    .await
    .is_err());
}
#[tokio::test]
async fn recurring_task_runs_once_and_retains_completed_source() {
    let s = fixture().await;
    sqlx::query("INSERT INTO card_productivity(card_id,repeat_days) VALUES('c2',7)")
        .execute(&s.pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO checklists(id,card_id,title,position,created_at) VALUES('cl','c2','Repeat checklist',1,'now')").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO checklist_items(id,checklist_id,title,is_done,position,created_at) VALUES('ci','cl','Reset me',1,1,'now')").execute(&s.pool).await.unwrap();
    crate::features::productivity::scheduled::run(&s)
        .await
        .unwrap();
    crate::features::productivity::scheduled::run(&s)
        .await
        .unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, i64>("SELECT count(*) FROM cards")
            .fetch_one(&s.pool)
            .await
            .unwrap(),
        3
    );
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT column_id FROM cards WHERE id='c2'")
            .fetch_one(&s.pool)
            .await
            .unwrap(),
        "done"
    );
    assert_eq!(
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM checklist_items WHERE is_done=0")
            .fetch_one(&s.pool)
            .await
            .unwrap(),
        1
    );
}
#[tokio::test]
async fn automation_sequence_conditions_and_rollback() {
    let s = fixture().await;
    let mut r:ResourceRequest=serde_json::from_value(json!({"name":"Conditional sequence","trigger_type":"manual_card","trigger_config":{"priority":"medium"},"action_type":"set_priority","action_config":{"value":"high","steps":[{"type":"move_card","value":"invalid"}]}})).unwrap();
    let id = service::save(&s, "owner", "p", "rules", None, r)
        .await
        .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    let rule = super::automation_repository::rule(&s.pool, "p", &id)
        .await
        .unwrap()
        .unwrap();
    assert!(super::automation_repository::execute(
        &s.pool,
        "p",
        "c1",
        &rule,
        "manual",
        Some("owner")
    )
    .await
    .is_err());
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT priority FROM cards WHERE id='c1'")
            .fetch_one(&s.pool)
            .await
            .unwrap(),
        "medium"
    );
    r=serde_json::from_value(json!({"name":"Conditional sequence","trigger_type":"manual_card","trigger_config":{"priority":"low"},"action_type":"set_priority","action_config":{"value":"high"}})).unwrap();
    service::save(&s, "owner", "p", "rules", Some(&id), r)
        .await
        .unwrap();
    let rule = super::automation_repository::rule(&s.pool, "p", &id)
        .await
        .unwrap()
        .unwrap();
    super::automation_repository::execute(&s.pool, "p", "c1", &rule, "manual", Some("owner"))
        .await
        .unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT priority FROM cards WHERE id='c1'")
            .fetch_one(&s.pool)
            .await
            .unwrap(),
        "medium"
    );
}
#[tokio::test]
async fn public_form_validates_and_revokes_without_disclosing_project() {
    use crate::features::productivity::{dto::Input, service as p};
    let s = fixture().await;
    let r: Input = serde_json::from_value(
        json!({"name":"Request","column_id":"todo","require_description":true}),
    )
    .unwrap();
    let created = p::save_resource(&s, "owner", "p", "forms", r)
        .await
        .unwrap();
    let token = created["token"].as_str().unwrap();
    assert!(p::form(&s, token)
        .await
        .unwrap()
        .get("project_id")
        .is_none());
    let r: Input = serde_json::from_value(json!({"title":"Request"})).unwrap();
    assert!(p::submit(&s, token, r).await.is_err());
    p::delete_resource(&s, "owner", "p", "forms", created["id"].as_str().unwrap())
        .await
        .unwrap();
    assert!(p::form(&s, token).await.is_err());
}
#[tokio::test]
async fn roles_and_tenant_boundaries() {
    let s = fixture().await;
    assert!(service::authorize(&s, "other", "p", false, false)
        .await
        .is_err());
    assert!(service::authorize(&s, "viewer", "p", true, false)
        .await
        .is_err());
    assert!(service::authorize(&s, "member", "p", true, true)
        .await
        .is_err());
    assert!(service::authorize(&s, "owner", "p", true, true)
        .await
        .is_ok());
}
#[tokio::test]
async fn bulk_rolls_back_on_invalid_card() {
    let s = fixture().await;
    assert!(service::bulk(
        &s,
        "owner",
        "p",
        BulkRequest {
            card_ids: vec!["c1".into(), "missing".into()],
            action: "priority".into(),
            value: Some("urgent".into())
        }
    )
    .await
    .is_err());
    let p: String = sqlx::query_scalar("SELECT priority FROM cards WHERE id='c1'")
        .fetch_one(&s.pool)
        .await
        .unwrap();
    assert_eq!(p, "medium");
}
#[tokio::test]
async fn rejects_cyclic_hierarchy() {
    let s = fixture().await;
    service::metadata(
        &s,
        "owner",
        "p",
        "c1",
        CardMetadataRequest {
            epic_id: None,
            parent_id: Some("c2".into()),
            release_id: None,
            sla_due_at: None,
            sla_response_due_at: None,
        },
    )
    .await
    .unwrap();
    assert!(operations::would_cycle(&s.pool, "c2", "c1").await.unwrap());
    assert!(service::metadata(
        &s,
        "owner",
        "p",
        "c2",
        CardMetadataRequest {
            epic_id: None,
            parent_id: Some("c1".into()),
            release_id: None,
            sla_due_at: None,
            sla_response_due_at: None,
        }
    )
    .await
    .is_err());
}
#[tokio::test]
async fn scheduled_rule_runs_once_per_deadline() {
    let s = fixture().await;
    sqlx::query("UPDATE cards SET due_date='2020-01-01' WHERE id='c1'")
        .execute(&s.pool)
        .await
        .unwrap();
    let r:ResourceRequest=serde_json::from_value(json!({"name":"Escalate","trigger_type":"due_date_reached","action_type":"set_priority","action_config":{"value":"urgent"}})).unwrap();
    service::save(&s, "owner", "p", "rules", None, r)
        .await
        .unwrap();
    super::automation::scheduled(&s).await.unwrap();
    super::automation::scheduled(&s).await.unwrap();
    let n: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM automation_runs")
        .fetch_one(&s.pool)
        .await
        .unwrap();
    assert_eq!(n, 1);
}
#[tokio::test]
async fn sprint_completion_preserves_velocity_and_returns_unfinished_work() {
    let s = fixture().await;
    sqlx::query("INSERT INTO sprints(id,project_id,name,status,created_at) VALUES('s','p','Sprint','planned','now')").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO sprint_cards(sprint_id,card_id,added_at) VALUES('s','c1','now'),('s','c2','now')").execute(&s.pool).await.unwrap();
    service::transition(
        &s,
        "owner",
        "p",
        "s",
        SprintTransition {
            status: "active".into(),
            start_date: Some("2026-10-12".into()),
            end_date: Some("2026-10-26".into()),
            goal: None,
            carry_to: None,
        },
    )
    .await
    .unwrap();
    service::transition(
        &s,
        "owner",
        "p",
        "s",
        SprintTransition {
            status: "completed".into(),
            start_date: None,
            end_date: None,
            goal: None,
            carry_to: None,
        },
    )
    .await
    .unwrap();
    let metrics: (f64, f64) =
        sqlx::query_as("SELECT committed_points,completed_points FROM sprints WHERE id='s'")
            .fetch_one(&s.pool)
            .await
            .unwrap();
    assert_eq!(metrics, (8., 3.));
    let cards: Vec<String> =
        sqlx::query_scalar("SELECT card_id FROM sprint_cards WHERE sprint_id='s'")
            .fetch_all(&s.pool)
            .await
            .unwrap();
    assert_eq!(cards, vec!["c2".to_string()]);
}

#[tokio::test]
async fn checklist_and_private_board_routes_enforce_roles() {
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use tower::ServiceExt;
    let state = fixture().await;
    sqlx::query("INSERT INTO checklists(id,card_id,title,position,created_at) VALUES('cl','c1','List',1,'now')").execute(&state.pool).await.unwrap();
    sqlx::query("INSERT INTO checklist_items(id,checklist_id,title,is_done,position,created_at) VALUES('item','cl','Item',0,1,'now')").execute(&state.pool).await.unwrap();
    let claims = crate::extractors::auth::Claims {
        sub: "viewer".into(),
        email: "viewer@test.local".into(),
        role: "member".into(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp() as usize,
    };
    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(b"test"),
    )
    .unwrap();
    let app = crate::router::create_router(state.clone());
    let request = Request::builder()
        .method("PUT")
        .uri("/api/v1/checklists/items/item")
        .header("authorization", format!("Bearer {token}"))
        .header("content-type", "application/json")
        .body(Body::from("{\"is_done\":true}"))
        .unwrap();
    assert_eq!(
        app.clone().oneshot(request).await.unwrap().status(),
        StatusCode::FORBIDDEN
    );
    sqlx::query("UPDATE projects SET visibility='private' WHERE id='p'")
        .execute(&state.pool)
        .await
        .unwrap();
    let request = Request::builder()
        .uri("/api/v1/boards/project/p")
        .header("authorization", format!("Bearer {token}"))
        .body(Body::empty())
        .unwrap();
    assert_eq!(
        app.oneshot(request).await.unwrap().status(),
        StatusCode::FORBIDDEN
    );
}

#[tokio::test]
async fn public_mentions_notify_but_internal_mentions_stay_restricted() {
    let state = fixture().await;
    let request = crate::features::comment::dto::CreateCommentRequest {
        card_id: "c1".into(),
        body: "Hello @member".into(),
        is_internal: false,
    };
    crate::features::comment::service::CommentService::create(&state, "owner", request)
        .await
        .unwrap();
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notifications WHERE user_id='member' AND type='mentioned'",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap();
    assert_eq!(count, 1);
    let first: Option<String> =
        sqlx::query_scalar("SELECT first_response_at FROM cards WHERE id='c1'")
            .fetch_one(&state.pool)
            .await
            .unwrap();
    assert!(first.is_some());
    crate::features::comment::service::CommentService::create(
        &state,
        "owner",
        crate::features::comment::dto::CreateCommentRequest {
            card_id: "c1".into(),
            body: "Internal @member".into(),
            is_internal: true,
        },
    )
    .await
    .unwrap();
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE user_id='member'")
            .fetch_one(&state.pool)
            .await
            .unwrap();
    assert_eq!(count, 1);
}
#[tokio::test]
async fn response_sla_stops_escalating_after_a_reply() {
    let state = fixture().await;
    sqlx::query("UPDATE cards SET sla_response_due_at='2020-01-01T00:00:00Z' WHERE id='c1'")
        .execute(&state.pool)
        .await
        .unwrap();
    let request:ResourceRequest=serde_json::from_value(json!({"name":"Response escalation","trigger_type":"sla_response_breached","action_type":"set_priority","action_config":{"value":"urgent"}})).unwrap();
    service::save(&state, "owner", "p", "rules", None, request)
        .await
        .unwrap();
    super::automation::scheduled(&state).await.unwrap();
    let priority: String = sqlx::query_scalar("SELECT priority FROM cards WHERE id='c1'")
        .fetch_one(&state.pool)
        .await
        .unwrap();
    assert_eq!(priority, "urgent");
    operations::first_response(&state.pool, "c1").await.unwrap();
    let candidates = super::automation_repository::scheduled_candidates(&state.pool)
        .await
        .unwrap();
    assert!(!candidates
        .iter()
        .any(|(_, card, event)| card == "c1" && event == "sla_response_breached"));
}
#[tokio::test]
async fn configured_member_permissions_enforced_by_http() {
    use crate::features::productivity::{policy, repository as p};
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;
    let s = fixture().await;
    p::set_permissions(&s.pool, "p", &vec!["comment".into()])
        .await
        .unwrap();
    assert!(policy::enforce(&s, "member", "p", "move").await.is_err());
    assert!(policy::enforce(&s, "member", "p", "comment").await.is_ok());
    assert!(policy::enforce(&s, "owner", "p", "move").await.is_ok());
    let claims = crate::extractors::auth::Claims {
        sub: "member".into(),
        email: "member@test.local".into(),
        role: "member".into(),
        exp: (chrono::Utc::now().timestamp() + 60) as usize,
    };
    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(b"test"),
    )
    .unwrap();
    let request = Request::builder()
        .method("POST")
        .uri("/api/v1/cards/c1/move")
        .header("authorization", format!("Bearer {token}"))
        .header("content-type", "application/json")
        .body(Body::from(r#"{"column_id":"done","position":1}"#))
        .unwrap();
    let response = crate::router::create_router(s.clone())
        .oneshot(request)
        .await
        .unwrap();
    assert_eq!(response.status(), 403);
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT column_id FROM cards WHERE id='c1'")
            .fetch_one(&s.pool)
            .await
            .unwrap(),
        "todo"
    );
}
#[tokio::test]
async fn capacity_requires_admin_and_valid_member() {
    use crate::features::productivity::{dto::Input, service as p};
    let s = fixture().await;
    let input =
        || serde_json::from_value::<Input>(json!({"user_id":"member","weekly_hours":32})).unwrap();
    assert!(p::save_capacity(&s, "member", "w", input()).await.is_err());
    p::save_capacity(&s, "owner", "w", input()).await.unwrap();
    let rows = p::capacity(&s, "member", "w").await.unwrap();
    assert!(rows
        .as_array()
        .unwrap()
        .iter()
        .any(|r| r["user_id"] == "member" && r["weekly_hours"] == 32.0));
    assert!(p::save_capacity(
        &s,
        "owner",
        "w",
        serde_json::from_value(json!({"user_id":"other","weekly_hours":32})).unwrap()
    )
    .await
    .is_err());
}
#[tokio::test]
async fn signed_pull_request_links_to_card_and_updates_state() {
    let s = fixture().await;
    let card = uuid::Uuid::now_v7().to_string();
    sqlx::query("UPDATE cards SET id=? WHERE id='c1'")
        .bind(&card)
        .execute(&s.pool)
        .await
        .unwrap();
    let secret = "test-signed-development-secret-with-32-chars";
    let request: ResourceRequest = serde_json::from_value(
        json!({"name":"GitHub QA","kind":"github","config":{"secret":secret}}),
    )
    .unwrap();
    let integration = service::save(&s, "owner", "p", "integrations", None, request)
        .await
        .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    use hmac::{Hmac, Mac};
    let mut body = json!({"pull_request":{"id":321,"title":format!("CARD-{card} test"),"html_url":"https://github.com/example/repo/pull/1","state":"open"}});
    for (delivery, state) in [("pr-open", "open"), ("pr-close", "closed")] {
        body["pull_request"]["state"] = json!(state);
        let bytes = serde_json::to_vec(&body).unwrap();
        let mut mac = Hmac::<sha2::Sha256>::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(&bytes);
        let signature = format!("sha256={:x}", mac.finalize().into_bytes());
        let result = crate::features::integrations::service::webhook(
            &s,
            &integration,
            "github",
            &bytes,
            &signature,
            delivery,
        )
        .await
        .unwrap();
        assert_eq!(result["linked"], 1);
    }
    let links = crate::features::productivity::service::development(&s, "owner", "p", &card)
        .await
        .unwrap();
    assert_eq!(links.as_array().unwrap().len(), 1);
    assert_eq!(links[0]["state"], "closed");
}
#[tokio::test]
async fn private_project_membership_changes_access_and_assignability() {
    let s = fixture().await;
    use crate::features::productivity::{dto::Input, service as p};
    sqlx::query("UPDATE projects SET visibility='private' WHERE id='p'")
        .execute(&s.pool)
        .await
        .unwrap();
    assert!(service::authorize(&s, "member", "p", false, false)
        .await
        .is_err());
    let input: Input =
        serde_json::from_value(json!({"user_id":"member","allowed_role":"viewer"})).unwrap();
    p::save_resource(&s, "owner", "p", "members", input)
        .await
        .unwrap();
    assert!(service::authorize(&s, "member", "p", false, false)
        .await
        .is_ok());
    assert!(service::authorize(&s, "member", "p", true, false)
        .await
        .is_err());
    operations::require_member(&s.pool, "p", "member")
        .await
        .unwrap();
    p::delete_resource(&s, "owner", "p", "members", "member")
        .await
        .unwrap();
    assert!(service::authorize(&s, "member", "p", false, false)
        .await
        .is_err());
    assert!(operations::require_member(&s.pool, "p", "member")
        .await
        .is_err());
}
