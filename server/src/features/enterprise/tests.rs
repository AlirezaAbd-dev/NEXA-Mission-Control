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
            static_dir: None,
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

fn local_input(v: serde_json::Value) -> crate::features::localops::dto::Input {
    serde_json::from_value(v).unwrap()
}
#[tokio::test]
async fn custom_roles_task_rules_and_bulk_do_not_bypass_permissions() {
    use crate::features::{localops::service as local, productivity::policy};
    let s = fixture().await;
    let role = local::save(
        &s,
        "owner",
        "p",
        "roles",
        local_input(json!({"name":"Contributor","permissions":["edit","comment","move"]})),
    )
    .await
    .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    local::save(
        &s,
        "owner",
        "p",
        "role-members",
        local_input(json!({"user_id":"member","role_id":role})),
    )
    .await
    .unwrap();
    assert!(
        policy::enforce_pool(&s.pool, "member", "p", Some("c1"), "edit")
            .await
            .is_ok()
    );
    assert!(
        policy::enforce_pool(&s.pool, "member", "p", Some("c1"), "archive")
            .await
            .is_err()
    );
    local::save(
        &s,
        "owner",
        "p",
        "task-permissions",
        local_input(json!({"user_id":"member","card_id":"c1","permissions":["comment"]})),
    )
    .await
    .unwrap();
    assert!(
        policy::enforce_pool(&s.pool, "member", "p", Some("c1"), "edit")
            .await
            .is_err()
    );
    assert!(
        policy::enforce_pool(&s.pool, "member", "p", Some("c1"), "comment")
            .await
            .is_ok()
    );
    assert!(
        policy::enforce_pool(&s.pool, "owner", "p", Some("c1"), "archive")
            .await
            .is_ok()
    );
    let request: BulkRequest = serde_json::from_value(
        json!({"card_ids":["c2","c1"],"action":"priority","value":"urgent"}),
    )
    .unwrap();
    assert!(service::bulk(&s, "member", "p", request).await.is_err());
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT priority FROM cards WHERE id='c2'")
            .fetch_one(&s.pool)
            .await
            .unwrap(),
        "medium"
    );
    local::save(
        &s,
        "owner",
        "p",
        "role-members",
        local_input(json!({"user_id":"viewer","role_id":role})),
    )
    .await
    .unwrap();
    assert!(
        policy::enforce_pool(&s.pool, "viewer", "p", Some("c2"), "edit")
            .await
            .is_err()
    );
    local::remove(&s, "owner", "p", "task-permissions", "c1:member")
        .await
        .unwrap();
    assert!(
        policy::enforce_pool(&s.pool, "member", "p", Some("c1"), "edit")
            .await
            .is_ok()
    );
    assert!(local::save(
        &s,
        "member",
        "p",
        "roles",
        local_input(json!({"name":"Elevated","permissions":["edit"]}))
    )
    .await
    .is_err());
    assert!(local::save(
        &s,
        "owner",
        "p",
        "roles",
        local_input(json!({"name":"Bad","permissions":["admin"]}))
    )
    .await
    .is_err());
}
#[tokio::test]
async fn service_desk_requester_isolation_internal_notes_and_sla() {
    use crate::features::localops::service as local;
    let s = fixture().await;
    local::save(
        &s,
        "owner",
        "p",
        "desk-settings",
        local_input(json!({"response_hours":1,"resolution_hours":4})),
    )
    .await
    .unwrap();
    let ticket = local::save(
        &s,
        "viewer",
        "p",
        "tickets",
        local_input(json!({"title":"Cannot open task","body":"Please help","priority":"high"})),
    )
    .await
    .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    assert_eq!(
        local::list(&s, "member", "p", "tickets")
            .await
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        0
    );
    assert!(local::messages(&s, "member", "p", &ticket).await.is_err());
    assert!(local::message(
        &s,
        "viewer",
        "p",
        &ticket,
        local_input(json!({"body":"Unauthorized staff note","internal":true}))
    )
    .await
    .is_err());
    local::message(
        &s,
        "owner",
        "p",
        &ticket,
        local_input(json!({"body":"Private agent note","internal":true})),
    )
    .await
    .unwrap();
    assert_eq!(
        local::messages(&s, "viewer", "p", &ticket)
            .await
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        0
    );
    assert!(local::list(&s, "owner", "p", "tickets").await.unwrap()[0]["responded_at"].is_null());
    local::message(
        &s,
        "owner",
        "p",
        &ticket,
        local_input(json!({"body":"We are investigating"})),
    )
    .await
    .unwrap();
    assert_eq!(
        local::messages(&s, "viewer", "p", &ticket)
            .await
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert!(local::list(&s, "owner", "p", "tickets").await.unwrap()[0]["responded_at"].is_string());
    assert!(local::save(
        &s,
        "viewer",
        "p",
        "tickets",
        local_input(json!({"id":ticket,"status":"resolved"}))
    )
    .await
    .is_err());
    local::save(
        &s,
        "owner",
        "p",
        "tickets",
        local_input(json!({"id":ticket,"status":"resolved"})),
    )
    .await
    .unwrap();
    assert!(local::list(&s, "owner", "p", "tickets").await.unwrap()[0]["resolved_at"].is_string());
    let role = local::save(
        &s,
        "owner",
        "p",
        "roles",
        local_input(json!({"name":"Support agent","permissions":["desk_agent"]})),
    )
    .await
    .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    local::save(
        &s,
        "owner",
        "p",
        "role-members",
        local_input(json!({"user_id":"member","role_id":role})),
    )
    .await
    .unwrap();
    assert!(local::staff(&s, "member", "p").await.unwrap());
    assert_eq!(
        local::list(&s, "owner", "p", "agents")
            .await
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert_eq!(
        local::messages(&s, "member", "p", &ticket)
            .await
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert!(local::list(&s, "other", "p", "tickets").await.is_err());
}
#[tokio::test]
async fn knowledge_base_drafts_and_local_plugins_are_scoped() {
    use crate::features::localops::service as local;
    let s = fixture().await;
    local::save(
        &s,
        "owner",
        "p",
        "articles",
        local_input(json!({"title":"Private draft","body":"Internal draft","published":false})),
    )
    .await
    .unwrap();
    local::save(
        &s,
        "owner",
        "p",
        "articles",
        local_input(json!({"title":"Published guide","body":"Useful answer","published":true})),
    )
    .await
    .unwrap();
    assert_eq!(
        local::list(&s, "viewer", "p", "articles")
            .await
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        local::list(&s, "owner", "p", "articles")
            .await
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert!(local::validate_manifest(&json!({"schema":1,"name":"Bad","version":"1","script":"fetch('https://external')","actions":[{"type":"set_priority","value":"urgent"}]})).is_err());
    let manifest = json!({"schema":1,"name":"Escalate","version":"1.0","actions":[{"type":"set_priority","value":"urgent"}]});
    let plugin = local::save(
        &s,
        "owner",
        "p",
        "plugins",
        local_input(json!({"manifest":manifest})),
    )
    .await
    .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    assert!(local::run(
        &s,
        "member",
        "p",
        &plugin,
        local_input(json!({"card_id":"c1"}))
    )
    .await
    .is_err());
    local::run(
        &s,
        "owner",
        "p",
        &plugin,
        local_input(json!({"card_id":"c1"})),
    )
    .await
    .unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT priority FROM cards WHERE id='c1'")
            .fetch_one(&s.pool)
            .await
            .unwrap(),
        "urgent"
    );
    local::save(
        &s,
        "owner",
        "p",
        "plugins",
        local_input(json!({"id":plugin,"manifest":manifest,"enabled":false})),
    )
    .await
    .unwrap();
    assert!(local::run(
        &s,
        "owner",
        "p",
        &plugin,
        local_input(json!({"card_id":"c1"}))
    )
    .await
    .is_err());
    local::remove(&s, "owner", "p", "plugins", &plugin)
        .await
        .unwrap();
    assert!(
        crate::features::enterprise::automation_repository::rule(&s.pool, "p", &plugin)
            .await
            .unwrap()
            .is_none()
    );
}
#[tokio::test]
async fn shared_event_bridge_and_worker_lease_coordinate_instances() {
    use crate::features::realtime::{bridge, repository as events};
    let s = fixture().await;
    let other = AppState::new(s.pool.clone(), (*s.config).clone());
    bridge::start(other.clone()).await.unwrap();
    let mut incoming = other.changes.subscribe();
    s.publish(Some("p"), None, "changed");
    let change = tokio::time::timeout(std::time::Duration::from_secs(3), incoming.recv())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(change.project_id.as_deref(), Some("p"));
    assert_eq!(change.kind, "changed");
    assert!(events::worker_lease(&s.pool, &s.instance_id).await.unwrap());
    assert!(!events::worker_lease(&s.pool, &other.instance_id)
        .await
        .unwrap());
    sqlx::query("UPDATE worker_leases SET expires_at=unixepoch()-1")
        .execute(&s.pool)
        .await
        .unwrap();
    assert!(events::worker_lease(&s.pool, &other.instance_id)
        .await
        .unwrap());
}

#[tokio::test]
async fn task_override_http_routes_and_linked_task_conversion_are_enforced() {
    use crate::features::localops::service as local;
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;
    let s = fixture().await;
    local::save(
        &s,
        "owner",
        "p",
        "task-permissions",
        local_input(json!({"user_id":"member","card_id":"c1","permissions":["comment"]})),
    )
    .await
    .unwrap();
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
    let app = crate::router::create_router(s.clone());
    for (uri, body) in [
        ("/api/v1/cards/c1", json!({"title":"Blocked"})),
        ("/api/v1/enterprise/projects/p/cards/c1/metadata", json!({})),
        (
            "/api/v1/productivity/projects/p/cards/c1/settings",
            json!({"repeat_days":7}),
        ),
    ] {
        let req = Request::builder()
            .method("PUT")
            .uri(uri)
            .header("authorization", format!("Bearer {token}"))
            .header("content-type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap();
        assert_eq!(
            app.clone().oneshot(req).await.unwrap().status(),
            403,
            "{uri}"
        );
    }
    let ticket = local::save(
        &s,
        "viewer",
        "p",
        "tickets",
        local_input(json!({"title":"Convert request","body":"Context"})),
    )
    .await
    .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    assert!(local::convert(
        &s,
        "viewer",
        "p",
        &ticket,
        local_input(json!({"column_id":"todo"}))
    )
    .await
    .is_err());
    let one = local::convert(
        &s,
        "owner",
        "p",
        &ticket,
        local_input(json!({"column_id":"todo"})),
    )
    .await
    .unwrap();
    let two = local::convert(
        &s,
        "owner",
        "p",
        &ticket,
        local_input(json!({"column_id":"todo"})),
    )
    .await
    .unwrap();
    assert_eq!(one, two);
    assert_eq!(
        sqlx::query_scalar::<_, i64>("SELECT count(*) FROM cards WHERE title='Convert request'")
            .fetch_one(&s.pool)
            .await
            .unwrap(),
        1
    );
}

#[tokio::test]
async fn audit_snapshots_record_named_changes_without_internal_comments() {
    use crate::features::activity::audit_repository as audit;
    let s = fixture().await;
    let before = audit::task_snapshot(&s.pool, "c1").await.unwrap().unwrap();
    sqlx::query(
        "UPDATE cards SET title='Renamed task',priority='high',column_id='done' WHERE id='c1'",
    )
    .execute(&s.pool)
    .await
    .unwrap();
    sqlx::query("INSERT INTO comments(id,card_id,author_id,body,is_internal,created_at) VALUES('internal-audit','c1','owner','Private staff discussion',1,'now')").execute(&s.pool).await.unwrap();
    let after = audit::task_snapshot(&s.pool, "c1").await.unwrap().unwrap();
    let changes = audit::changes(&before, &after);
    assert_eq!(changes["title"]["before"], "c1");
    assert_eq!(changes["title"]["after"], "Renamed task");
    assert_eq!(changes["status"]["before"], "todo");
    assert_eq!(changes["status"]["after"], "done");
    assert_eq!(changes["priority"]["after"], "high");
    assert!(changes.get("public_comments").is_none());
    assert!(!after.to_string().contains("Private staff discussion"));
    assert!(audit::changes(&after, &after)
        .as_object()
        .unwrap()
        .is_empty());
}
#[tokio::test]
async fn successful_task_edit_exposes_structured_audit_changes_through_http() {
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;
    let s = fixture().await;
    let claims = crate::extractors::auth::Claims {
        sub: "owner".into(),
        email: "owner@test.local".into(),
        role: "member".into(),
        exp: (chrono::Utc::now().timestamp() + 60) as usize,
    };
    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(b"test"),
    )
    .unwrap();
    let req = Request::builder()
        .method("PUT")
        .uri("/api/v1/cards/c1")
        .header("authorization", format!("Bearer {token}"))
        .header("content-type", "application/json")
        .body(Body::from(
            r#"{"title":"Audited rename","priority":"high"}"#,
        ))
        .unwrap();
    assert_eq!(
        crate::router::create_router(s.clone())
            .oneshot(req)
            .await
            .unwrap()
            .status(),
        200
    );
    let payload:String=sqlx::query_scalar("SELECT payload FROM activities WHERE card_id='c1' AND action='api_mutation' ORDER BY created_at DESC LIMIT 1").fetch_one(&s.pool).await.unwrap();
    let value: serde_json::Value = serde_json::from_str(&payload).unwrap();
    assert_eq!(value["changes"]["title"]["before"], "c1");
    assert_eq!(value["changes"]["title"]["after"], "Audited rename");
    assert_eq!(value["changes"]["priority"]["before"], "medium");
}

#[tokio::test]
async fn checklist_edit_delete_http_validation_permissions_and_cascade() {
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;
    let s = fixture().await;
    sqlx::query("INSERT INTO checklists(id,card_id,title,position,created_at) VALUES('list','c1','Original',1,'now')").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO checklist_items(id,checklist_id,title,is_done,position,created_at) VALUES('item','list','Original item',0,1,'now')").execute(&s.pool).await.unwrap();
    let app = crate::router::create_router(s.clone());
    for (user, method, path, body, expected) in [
        (
            "viewer",
            "PUT",
            "/checklists/list",
            r#"{"title":"Blocked"}"#,
            403,
        ),
        ("other", "DELETE", "/checklists/list", "{}", 403),
        ("viewer", "DELETE", "/checklists/items/item", "{}", 403),
        (
            "owner",
            "PUT",
            "/checklists/list",
            r#"{"title":"   "}"#,
            400,
        ),
        (
            "owner",
            "PUT",
            "/checklists/items/item",
            r#"{"title":""}"#,
            400,
        ),
        (
            "owner",
            "PUT",
            "/checklists/list",
            r#"{"title":" Renamed "}"#,
            200,
        ),
        (
            "owner",
            "PUT",
            "/checklists/items/item",
            r#"{"title":"Edited item"}"#,
            200,
        ),
        ("owner", "DELETE", "/checklists/items/item", "{}", 200),
    ] {
        let claims = crate::extractors::auth::Claims {
            sub: user.into(),
            email: format!("{user}@test.local"),
            role: "member".into(),
            exp: (chrono::Utc::now().timestamp() + 60) as usize,
        };
        let token = jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &claims,
            &jsonwebtoken::EncodingKey::from_secret(b"test"),
        )
        .unwrap();
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(format!("/api/v1{path}"))
                    .header("authorization", format!("Bearer {token}"))
                    .header("content-type", "application/json")
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            response.status().as_u16(),
            expected,
            "{user} {method} {path}"
        );
    }
    let title: String = sqlx::query_scalar("SELECT title FROM checklists WHERE id='list'")
        .fetch_one(&s.pool)
        .await
        .unwrap();
    assert_eq!(title, "Renamed");
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM checklist_items WHERE id='item'")
        .fetch_one(&s.pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
    sqlx::query("INSERT INTO checklist_items(id,checklist_id,title,is_done,position,created_at) VALUES('cascade','list','Cascade item',0,1,'now')").execute(&s.pool).await.unwrap();
    crate::features::checklist::repository::ChecklistRepository::delete_checklist(&s.pool, "list")
        .await
        .unwrap();
    let count: i64 =
        sqlx::query_scalar("SELECT count(*) FROM checklist_items WHERE checklist_id='list'")
            .fetch_one(&s.pool)
            .await
            .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn task_removal_and_restore_use_archive_permission_and_preserve_data() {
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;
    let s = fixture().await;
    crate::features::productivity::repository::set_permissions(
        &s.pool,
        "p",
        &vec!["archive".into()],
    )
    .await
    .unwrap();
    let app = crate::router::create_router(s.clone());
    for (user, method, path, body, expected, archived) in [
        ("viewer", "DELETE", "/cards/c1", "{}", 403, false),
        ("member", "DELETE", "/cards/c1", "{}", 200, true),
        (
            "member",
            "POST",
            "/cards/c1/archive",
            r#"{"archive":false}"#,
            200,
            false,
        ),
        (
            "member",
            "POST",
            "/cards/c1/archive",
            r#"{"archive":true}"#,
            200,
            true,
        ),
    ] {
        let claims = crate::extractors::auth::Claims {
            sub: user.into(),
            email: format!("{user}@test.local"),
            role: "member".into(),
            exp: (chrono::Utc::now().timestamp() + 60) as usize,
        };
        let token = jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &claims,
            &jsonwebtoken::EncodingKey::from_secret(b"test"),
        )
        .unwrap();
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(format!("/api/v1{path}"))
                    .header("authorization", format!("Bearer {token}"))
                    .header("content-type", "application/json")
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            response.status().as_u16(),
            expected,
            "{user} {method} {path}"
        );
        let flag: bool =
            sqlx::query_scalar("SELECT archived_at IS NOT NULL FROM cards WHERE id='c1'")
                .fetch_one(&s.pool)
                .await
                .unwrap();
        assert_eq!(flag, archived);
    }
    let title: String = sqlx::query_scalar("SELECT title FROM cards WHERE id='c1'")
        .fetch_one(&s.pool)
        .await
        .unwrap();
    assert_eq!(title, "c1");
    crate::features::productivity::repository::set_permissions(&s.pool, "p", &vec!["edit".into()])
        .await
        .unwrap();
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
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/cards/c1/archive")
                .header("authorization", format!("Bearer {token}"))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"archive":false}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), 403);
}

#[tokio::test]
async fn author_and_admin_comment_edit_delete_lifecycle() {
    let state = fixture().await;
    let comment = crate::features::comment::service::CommentService::create(
        &state,
        "member",
        crate::features::comment::dto::CreateCommentRequest {
            card_id: "c1".into(),
            body: "Original comment text".into(),
            is_internal: false,
        },
    )
    .await
    .unwrap();

    assert_eq!(comment.body, "Original comment text");
    assert!(comment.edited_at.is_none());

    // Non-author member cannot edit
    let edit_forbidden = crate::features::comment::service::CommentService::update(
        &state,
        &comment.id,
        "other_user",
        crate::features::comment::dto::UpdateCommentRequest {
            body: "Hacked comment".into(),
        },
    )
    .await;
    assert!(edit_forbidden.is_err());

    // Author can edit
    let updated = crate::features::comment::service::CommentService::update(
        &state,
        &comment.id,
        "member",
        crate::features::comment::dto::UpdateCommentRequest {
            body: "Edited comment text".into(),
        },
    )
    .await
    .unwrap();
    assert_eq!(updated.body, "Edited comment text");
    assert!(updated.edited_at.is_some());

    // Non-author non-admin cannot delete
    let delete_forbidden = crate::features::comment::service::CommentService::delete(
        &state,
        &comment.id,
        "other_user",
    )
    .await;
    assert!(delete_forbidden.is_err());

    // Author can delete
    let deleted =
        crate::features::comment::service::CommentService::delete(&state, &comment.id, "member")
            .await;
    assert!(deleted.is_ok());

    // Verify it is gone
    let list =
        crate::features::comment::service::CommentService::list_by_card(&state, "c1", "member")
            .await
            .unwrap();
    assert!(!list.iter().any(|c| c.id == comment.id));
}

#[tokio::test]
async fn board_columns_rename_and_reorder_validate_scope_and_permissions() {
    use crate::features::board::{
        dto::{ReorderColumnsRequest, UpdateColumnRequest},
        service::BoardService,
    };
    let s = fixture().await;
    let rename = |name: &str| UpdateColumnRequest {
        name: Some(name.into()),
        type_: None,
        position: None,
        wip_limit: None,
    };
    let result = BoardService::update_column(&s, "todo", "owner", rename("  Ready to start  "))
        .await
        .unwrap();
    assert_eq!(result.name, "Ready to start");
    assert!(
        BoardService::update_column(&s, "todo", "owner", rename("   "))
            .await
            .is_err()
    );
    assert!(
        BoardService::update_column(&s, "todo", "viewer", rename("Blocked"))
            .await
            .is_err()
    );
    assert!(
        BoardService::update_column(&s, "todo", "other", rename("Blocked"))
            .await
            .is_err()
    );
    let request = |ids: Vec<&str>| ReorderColumnsRequest {
        column_ids: ids.into_iter().map(str::to_owned).collect(),
    };
    assert!(
        BoardService::reorder_columns(&s, "b", "viewer", request(vec!["done", "todo"]))
            .await
            .is_err()
    );
    BoardService::reorder_columns(&s, "b", "owner", request(vec!["done", "todo"]))
        .await
        .unwrap();
    let before = crate::features::board::repository::BoardRepository::list_columns(&s.pool, "b")
        .await
        .unwrap();
    assert_eq!(
        before.iter().map(|c| c.id.as_str()).collect::<Vec<_>>(),
        vec!["done", "todo"]
    );
    // A foreign-board ID must never be mutated, even if supplied alongside a valid ID.
    sqlx::query("INSERT INTO boards(id,project_id,name,created_at) VALUES('foreign','p','Other board','now')").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO columns(id,board_id,name,type,position,created_at) VALUES('foreign-col','foreign','Foreign','active',123,'now')").execute(&s.pool).await.unwrap();
    for ids in [
        vec!["todo", "todo"],
        vec!["todo"],
        vec!["todo", "foreign-col"],
        vec!["todo", "missing"],
        vec![],
    ] {
        assert!(
            BoardService::reorder_columns(&s, "b", "owner", request(ids))
                .await
                .is_err()
        );
    }
    let after = crate::features::board::repository::BoardRepository::list_columns(&s.pool, "b")
        .await
        .unwrap();
    assert_eq!(
        before
            .iter()
            .map(|c| (&c.id, c.position))
            .collect::<Vec<_>>(),
        after
            .iter()
            .map(|c| (&c.id, c.position))
            .collect::<Vec<_>>()
    );
    let position: f64 = sqlx::query_scalar("SELECT position FROM columns WHERE id='foreign-col'")
        .fetch_one(&s.pool)
        .await
        .unwrap();
    assert_eq!(position, 123.);
    // Repository safety also rolls back earlier updates if a later ID is invalid.
    assert!(
        crate::features::board::repository::BoardRepository::reorder_columns(
            &s.pool,
            "b",
            &vec!["todo".into(), "foreign-col".into()]
        )
        .await
        .is_err()
    );
    let after = crate::features::board::repository::BoardRepository::list_columns(&s.pool, "b")
        .await
        .unwrap();
    assert_eq!(
        before
            .iter()
            .map(|c| (&c.id, c.position))
            .collect::<Vec<_>>(),
        after
            .iter()
            .map(|c| (&c.id, c.position))
            .collect::<Vec<_>>()
    );
}

#[tokio::test]
async fn board_column_http_mutations_publish_realtime_changes() {
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;
    let s = fixture().await;
    let mut events = s.changes.subscribe();
    let claims = crate::extractors::auth::Claims {
        sub: "owner".into(),
        email: "owner@test.local".into(),
        role: "member".into(),
        exp: (chrono::Utc::now().timestamp() + 60) as usize,
    };
    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(b"test"),
    )
    .unwrap();
    let app = crate::router::create_router(s.clone());
    for (method, path, payload) in [
        (
            "PUT",
            "/api/v1/boards/columns/todo",
            r#"{"name":"New name"}"#,
        ),
        (
            "POST",
            "/api/v1/boards/b/columns/reorder",
            r#"{"column_ids":["done","todo"]}"#,
        ),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(path)
                    .header("authorization", format!("Bearer {token}"))
                    .header("content-type", "application/json")
                    .body(Body::from(payload))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), 200);
        let change = events.try_recv().unwrap();
        assert_eq!(change.project_id.as_deref(), Some("p"));
        assert_eq!(change.kind, "changed");
    }
    let board = crate::features::board::service::BoardService::get_by_project_id(&s, "p", "owner")
        .await
        .unwrap();
    assert_eq!(board.columns[0].id, "done");
    assert_eq!(board.columns[1].name, "New name");
}

#[tokio::test]
async fn anchored_task_placement_handles_ties_and_rejects_foreign_targets() {
    use crate::features::card::repository::CardRepository;
    let s = fixture().await;
    sqlx::query("INSERT INTO cards(id,project_id,column_id,title,priority,position,created_at,updated_at) VALUES('c3','p','todo','Third','medium',1,'now','now')").execute(&s.pool).await.unwrap();
    CardRepository::move_card_placed(&s.pool, "c2", "todo", Some("c3"), "later")
        .await
        .unwrap();
    let ids: Vec<String> = sqlx::query_scalar(
        "SELECT id FROM cards WHERE column_id='todo' ORDER BY position,created_at,id",
    )
    .fetch_all(&s.pool)
    .await
    .unwrap();
    assert_eq!(ids, vec!["c1", "c2", "c3"]);
    let positions: Vec<f64> =
        sqlx::query_scalar("SELECT position FROM cards WHERE column_id='todo' ORDER BY position")
            .fetch_all(&s.pool)
            .await
            .unwrap();
    assert!(positions.windows(2).all(|p| p[0] < p[1]));
    assert!(
        CardRepository::move_card_placed(&s.pool, "c2", "todo", Some("missing"), "invalid")
            .await
            .is_err()
    );
    let after: Vec<String> =
        sqlx::query_scalar("SELECT id FROM cards WHERE column_id='todo' ORDER BY position")
            .fetch_all(&s.pool)
            .await
            .unwrap();
    assert_eq!(ids, after);
    CardRepository::move_card_placed(&s.pool, "c2", "done", None, "later")
        .await
        .unwrap();
    let column: String = sqlx::query_scalar("SELECT column_id FROM cards WHERE id='c2'")
        .fetch_one(&s.pool)
        .await
        .unwrap();
    assert_eq!(column, "done");
}

#[tokio::test]
async fn profile_updates_validate_names_avatars_and_preserve_account_identity() {
    use crate::features::auth::{
        dto::UpdateUserRequest, repository::AuthRepository, service::AuthService,
    };
    let s = fixture().await;
    let request = |name: Option<&str>, avatar: Option<&str>| UpdateUserRequest {
        display_name: name.map(str::to_owned),
        avatar_url: avatar.map(str::to_owned),
    };
    let edited = AuthService::update_me(
        &s,
        "member",
        request(
            Some("  Updated Member  "),
            Some("https://example.test/avatar.png"),
        ),
    )
    .await
    .unwrap();
    assert_eq!(edited.display_name, "Updated Member");
    assert_eq!(edited.username, "member");
    assert_eq!(edited.email, "member@test.local");
    assert_eq!(
        edited.avatar_url.as_deref(),
        Some("https://example.test/avatar.png")
    );
    let preserved = AuthService::update_me(&s, "member", request(Some("Another name"), None))
        .await
        .unwrap();
    assert_eq!(preserved.avatar_url, edited.avatar_url);
    for name in [" ", "A", &"x".repeat(51)] {
        assert!(
            AuthService::update_me(&s, "member", request(Some(name), None))
                .await
                .is_err()
        );
    }
    for avatar in [
        "javascript:alert(1)",
        "data:image/svg+xml,bad",
        "/uploads/../secret.png",
        "http://example.test/avatar.png",
    ] {
        assert!(
            AuthService::update_me(&s, "member", request(None, Some(avatar)))
                .await
                .is_err()
        );
    }
    let cleared = AuthService::update_me(&s, "member", request(None, Some("")))
        .await
        .unwrap();
    assert!(cleared.avatar_url.is_none());
    assert_eq!(
        AuthRepository::find_by_id(&s.pool, "owner")
            .await
            .unwrap()
            .unwrap()
            .display_name,
        "owner"
    );
}
#[tokio::test]
async fn avatar_upload_enforces_image_type_and_size() {
    use crate::features::auth::avatar_service::{store_avatar, MAX_AVATAR_BYTES};
    let s = fixture().await;
    assert!(
        store_avatar(&s, "member", b"<svg><script>alert(1)</script></svg>")
            .await
            .is_err()
    );
    assert!(store_avatar(&s, "member", &vec![0; MAX_AVATAR_BYTES + 1])
        .await
        .is_err());
    let uploaded = store_avatar(&s, "member", b"\x89PNG\r\n\x1a\nfixture")
        .await
        .unwrap();
    assert!(uploaded.url.starts_with("/uploads/avatars/member/"));
    assert!(uploaded.url.ends_with(".png"));
    let path = std::path::Path::new(&s.config.upload_dir)
        .join(uploaded.url.trim_start_matches("/uploads/"));
    assert!(path.exists());
    tokio::fs::remove_file(path).await.unwrap();
}
#[tokio::test]
async fn profile_http_edits_only_the_authenticated_user() {
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;
    let s = fixture().await;
    let app = crate::router::create_router(s.clone());
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
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/auth/me")
                .header("authorization", format!("Bearer {token}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"display_name":"Profile HTTP","id":"owner","role":"admin"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    let name: String = sqlx::query_scalar("SELECT display_name FROM users WHERE id='member'")
        .fetch_one(&s.pool)
        .await
        .unwrap();
    assert_eq!(name, "Profile HTTP");
    let name: String = sqlx::query_scalar("SELECT display_name FROM users WHERE id='owner'")
        .fetch_one(&s.pool)
        .await
        .unwrap();
    assert_eq!(name, "owner");
    let response = app
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/auth/me")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"display_name":"Anonymous"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), 401);
}

#[tokio::test]
async fn permanent_task_delete_http_requires_admin_and_archived_state_and_emits_event() {
    use axum::{body::Body,http::Request};
    use tower::ServiceExt;
    let s=fixture().await;
    let app=crate::router::create_router(s.clone());
    let mut events=s.changes.subscribe();
    for (user,card,expected) in [("owner","c1",409),("viewer","c1",403),("member","c1",403),("other","c1",403)] {
        let claims=crate::extractors::auth::Claims{sub:user.into(),email:format!("{user}@test.local"),role:"owner".into(),exp:(chrono::Utc::now().timestamp()+60) as usize};
        let token=jsonwebtoken::encode(&jsonwebtoken::Header::default(),&claims,&jsonwebtoken::EncodingKey::from_secret(b"test")).unwrap();
        let response=app.clone().oneshot(Request::builder().method("DELETE").uri(format!("/api/v1/cards/{card}/permanent")).header("authorization",format!("Bearer {token}")).body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(response.status().as_u16(),expected,"{user}");
    }
    assert!(events.try_recv().is_err());
    sqlx::query("UPDATE cards SET archived_at='now' WHERE id='c1'").execute(&s.pool).await.unwrap();
    // The global JWT role is not sufficient: the database project role is authoritative.
    for user in ["member","viewer","other"] {
        assert!(crate::features::card::service::CardService::delete_permanently(&s,"c1",user).await.is_err());
    }
    let claims=crate::extractors::auth::Claims{sub:"owner".into(),email:"owner@test.local".into(),role:"member".into(),exp:(chrono::Utc::now().timestamp()+60) as usize};
    let token=jsonwebtoken::encode(&jsonwebtoken::Header::default(),&claims,&jsonwebtoken::EncodingKey::from_secret(b"test")).unwrap();
    let response=app.oneshot(Request::builder().method("DELETE").uri("/api/v1/cards/c1/permanent").header("authorization",format!("Bearer {token}")).body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(response.status(),200);
    assert_eq!(sqlx::query_scalar::<_,i64>("SELECT count(*) FROM cards WHERE id='c1'").fetch_one(&s.pool).await.unwrap(),0);
    assert_eq!(events.try_recv().unwrap().project_id.as_deref(),Some("p"));
    let payload:String=sqlx::query_scalar("SELECT payload FROM activities WHERE action='permanently_deleted_card' AND project_id='p'").fetch_one(&s.pool).await.unwrap();
    let value:serde_json::Value=serde_json::from_str(&payload).unwrap();
    assert_eq!(value["task_title"],"c1");
    assert_eq!(value["deleted_card_id"],"c1");
    assert!(crate::features::card::service::CardService::delete_permanently(&s,"c1","owner").await.is_err());
}

#[tokio::test]
async fn permanent_task_delete_cascades_children_preserves_history_and_shared_files() {
    use crate::features::card::{service::CardService,repository::CardRepository};
    let mut s=fixture().await;
    let folder=std::env::temp_dir().join(format!("mission-delete-test-{}",uuid::Uuid::now_v7()));
    tokio::fs::create_dir_all(&folder).await.unwrap();
    let mut config=(*s.config).clone();
    config.upload_dir=folder.to_string_lossy().into_owned();
    s.config=std::sync::Arc::new(config);
    for name in ["orphan.txt","shared.txt"] {tokio::fs::write(folder.join(name),b"sample").await.unwrap();}
    sqlx::query("INSERT INTO project_members(id,project_id,user_id,role,joined_at) VALUES('pm','p','member','admin','now')").execute(&s.pool).await.unwrap();
    sqlx::query("UPDATE cards SET parent_id='c1',cover_url='/uploads/shared.txt' WHERE id='c2'").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO comments(id,card_id,author_id,body,created_at) VALUES('comment','c1','owner','body','now')").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO checklists(id,card_id,title,position,created_at) VALUES('checklist','c1','List',0,'now')").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO checklist_items(id,checklist_id,title,position,created_at) VALUES('item','checklist','Item',0,'now')").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO activities(id,workspace_id,project_id,card_id,actor_id,action,payload,created_at) VALUES('old-audit','w','p','c1','owner','created_card','{}','now')").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO desk_tickets(id,project_id,requester_id,card_id,title,description,status,priority,created_at,updated_at,response_due_at,resolution_due_at) VALUES('ticket','p','owner','c1','Support','Details','new','medium','now','now','later','later')").execute(&s.pool).await.unwrap();
    for name in ["orphan.txt","shared.txt"] {
        sqlx::query("INSERT INTO attachments(id,card_id,filename,file_path,file_size,mime_type,created_at) VALUES(?,'c1',?,?,6,'text/plain','now')").bind(name).bind(name).bind(format!("/uploads/{name}")).execute(&s.pool).await.unwrap();
    }
    // Repository also refuses active/restored tasks, even if a caller bypasses the service.
    assert!(CardRepository::delete_archived(&s.pool,"c1","p","owner").await.is_err());
    sqlx::query("UPDATE cards SET archived_at='now' WHERE id='c1'").execute(&s.pool).await.unwrap();
    CardService::delete_permanently(&s,"c1","member").await.unwrap();
    for table in ["comments","checklists","checklist_items","attachments"] {
        assert_eq!(sqlx::query_scalar::<_,i64>(&format!("SELECT count(*) FROM {table}")).fetch_one(&s.pool).await.unwrap(),0, "{table}");
    }
    assert!(sqlx::query_scalar::<_,Option<String>>("SELECT parent_id FROM cards WHERE id='c2'").fetch_one(&s.pool).await.unwrap().is_none());
    assert!(sqlx::query_scalar::<_,Option<String>>("SELECT card_id FROM desk_tickets WHERE id='ticket'").fetch_one(&s.pool).await.unwrap().is_none());
    assert_eq!(sqlx::query_scalar::<_,i64>("SELECT count(*) FROM activities WHERE id='old-audit'").fetch_one(&s.pool).await.unwrap(),1);
    assert!(!folder.join("orphan.txt").exists());
    assert!(folder.join("shared.txt").exists());
    tokio::fs::remove_dir_all(folder).await.unwrap();
}

#[tokio::test]
async fn workspace_and_project_update_and_delete_permissions() {
    let s = fixture().await;

    // 1. Workspace update: member cannot update, owner can update
    let req = crate::features::workspace::dto::UpdateWorkspaceRequest {
        name: Some("Renamed Workspace".into()),
        description: Some("New description".into()),
        logo_url: None,
    };
    let member_update = crate::features::workspace::service::WorkspaceService::update(
        &s,
        "w",
        "member",
        req,
    )
    .await;
    assert!(member_update.is_err());

    let owner_update = crate::features::workspace::service::WorkspaceService::update(
        &s,
        "w",
        "owner",
        crate::features::workspace::dto::UpdateWorkspaceRequest {
            name: Some("Renamed Workspace".into()),
            description: Some("New description".into()),
            logo_url: None,
        },
    )
    .await
    .unwrap();
    assert_eq!(owner_update.name, "Renamed Workspace");

    // 2. Project update: member cannot update, owner can update
    let proj_update_forbidden = crate::features::project::service::ProjectService::update(
        &s,
        "p",
        "member",
        crate::features::project::dto::UpdateProjectRequest {
            name: Some("Hacked Project".into()),
            description: None,
            color: None,
            cover_url: None,
            visibility: None,
        },
    )
    .await;
    assert!(proj_update_forbidden.is_err());

    let proj_update_ok = crate::features::project::service::ProjectService::update(
        &s,
        "p",
        "owner",
        crate::features::project::dto::UpdateProjectRequest {
            name: Some("Renamed Project".into()),
            description: Some("Updated description".into()),
            color: Some("#3b82f6".into()),
            cover_url: None,
            visibility: None,
        },
    )
    .await
    .unwrap();
    assert_eq!(proj_update_ok.name, "Renamed Project");

    // 3. Project delete: member cannot delete, owner can delete
    let proj_del_forbidden =
        crate::features::project::service::ProjectService::delete(&s, "p", "member").await;
    assert!(proj_del_forbidden.is_err());

    let proj_del_ok =
        crate::features::project::service::ProjectService::delete(&s, "p", "owner").await;
    assert!(proj_del_ok.is_ok());

    // 4. Workspace delete: non-owner cannot delete, owner can delete
    let ws_del_forbidden =
        crate::features::workspace::service::WorkspaceService::delete(&s, "w", "member").await;
    assert!(ws_del_forbidden.is_err());

    let ws_del_ok =
        crate::features::workspace::service::WorkspaceService::delete(&s, "w", "owner").await;
    assert!(ws_del_ok.is_ok());
}

#[tokio::test]
async fn notes_personal_privacy_and_workspace_roles_are_enforced() {
 use crate::features::notes::{service as n,dto::*};
 let s=fixture().await;
 let personal=n::create(&s,"owner",serde_json::from_value(json!({"title":"Private idea","body":"<p dir=\"rtl\">یادداشت خصوصی</p>","owner_id":"member"})).unwrap()).await.unwrap();
 assert_eq!(personal.owner_id.as_deref(),Some("owner"));
 assert!(n::get(&s,"member",&personal.id).await.is_err());
 assert!(n::list(&s,"member",ListNotes::default()).await.unwrap().is_empty());
 assert_eq!(n::list(&s,"owner",ListNotes::default()).await.unwrap().len(),1);
 let shared=n::create(&s,"owner",serde_json::from_value(json!({"workspace_id":"w","title":"Team notes","body":"Shared context"})).unwrap()).await.unwrap();
 assert!(n::get(&s,"viewer",&shared.id).await.unwrap().can_edit==false);
 assert!(n::get(&s,"member",&shared.id).await.unwrap().can_edit);
 assert!(n::get(&s,"other",&shared.id).await.is_err());
 for user in ["viewer","other"] {
  assert!(n::create(&s,user,serde_json::from_value(json!({"workspace_id":"w","title":"Blocked"})).unwrap()).await.is_err());
  assert!(n::update(&s,user,&shared.id,serde_json::from_value(json!({"version":1,"body":"Blocked"})).unwrap()).await.is_err());
  assert!(n::update(&s,user,&shared.id,serde_json::from_value(json!({"version":1,"trashed":true})).unwrap()).await.is_err());
 }
 assert!(n::list(&s,"owner",serde_json::from_value(json!({"scope":"personal","workspace_id":"w"})).unwrap()).await.is_err());
}

#[tokio::test]
async fn notes_version_conflicts_search_pin_trash_and_restore_preserve_content() {
 use crate::features::notes::{service as n,dto::*};
 let s=fixture().await;
 let original=n::create(&s,"owner",serde_json::from_value(json!({"workspace_id":"w","title":"  Release notebook  ","body":"<p dir=\"rtl\">برنامه پروژه</p>"})).unwrap()).await.unwrap();
 assert_eq!(original.title,"Release notebook");
 let updated=n::update(&s,"member",&original.id,serde_json::from_value(json!({"version":1,"body":"<p dir=\"rtl\">برنامه انتشار</p>","pinned":true})).unwrap()).await.unwrap();
 assert_eq!(updated.version,2);
 assert!(n::update(&s,"owner",&original.id,serde_json::from_value(json!({"version":1,"body":"stale overwrite"})).unwrap()).await.is_err());
 assert_eq!(n::get(&s,"owner",&original.id).await.unwrap().body,updated.body);
 let found=n::list(&s,"viewer",serde_json::from_value(json!({"scope":"workspace","workspace_id":"w","q":"انتشار"})).unwrap()).await.unwrap();
 assert_eq!(found.len(),1);assert!(found[0].body.is_none());assert!(found[0].pinned);
 let trashed=n::update(&s,"member",&original.id,serde_json::from_value(json!({"version":2,"trashed":true})).unwrap()).await.unwrap();
 assert!(trashed.deleted_at.is_some());
 let list:ListNotes=serde_json::from_value(json!({"scope":"workspace","workspace_id":"w"})).unwrap();
 assert!(n::list(&s,"owner",list).await.unwrap().is_empty());
 assert_eq!(n::list(&s,"owner",serde_json::from_value(json!({"scope":"workspace","workspace_id":"w","trash":true})).unwrap()).await.unwrap().len(),1);
 assert!(n::update(&s,"owner",&original.id,serde_json::from_value(json!({"version":3,"body":"bad"})).unwrap()).await.is_err());
 assert!(n::update(&s,"viewer",&original.id,serde_json::from_value(json!({"version":3,"trashed":false})).unwrap()).await.is_err());
 let restored=n::update(&s,"owner",&original.id,serde_json::from_value(json!({"version":3,"trashed":false})).unwrap()).await.unwrap();
 assert!(restored.deleted_at.is_none());assert_eq!(restored.body,updated.body);
 for q in ["quote \" test","*","-","برنامه"] {
  assert!(n::list(&s,"owner",serde_json::from_value(json!({"scope":"workspace","workspace_id":"w","q":q})).unwrap()).await.is_ok());
 }
}

#[tokio::test]
async fn notes_task_links_hide_private_projects_and_do_not_change_tasks() {
 use crate::features::notes::service as n;
 let s=fixture().await;
 sqlx::query("UPDATE projects SET visibility='private' WHERE id='p'").execute(&s.pool).await.unwrap();
 let note=n::create(&s,"owner",serde_json::from_value(json!({"workspace_id":"w","title":"Team"})).unwrap()).await.unwrap();
 n::link(&s,"owner",&note.id,"c1",false).await.unwrap();
 assert_eq!(n::links(&s,"owner",&note.id).await.unwrap().len(),1);
 assert!(n::links(&s,"member",&note.id).await.unwrap().is_empty());
 assert!(n::link(&s,"member",&note.id,"c2",false).await.is_err());
 assert!(n::link(&s,"viewer",&note.id,"c1",true).await.is_err());
 assert!(n::links(&s,"other",&note.id).await.is_err());
 n::link(&s,"owner",&note.id,"c1",true).await.unwrap();
 assert!(n::links(&s,"owner",&note.id).await.unwrap().is_empty());
 assert_eq!(sqlx::query_scalar::<_,i64>("SELECT count(*) FROM cards").fetch_one(&s.pool).await.unwrap(),2);
}

#[tokio::test]
async fn notes_http_authentication_privacy_and_realtime_payloads() {
 use axum::{body::{Body,to_bytes},http::Request};use tower::ServiceExt;
 let s=fixture().await;let app=crate::router::create_router(s.clone());let mut events=s.changes.subscribe();
 let response=app.clone().oneshot(Request::builder().uri("/api/v1/notes").body(Body::empty()).unwrap()).await.unwrap();
 assert_eq!(response.status(),401);
 let claims=crate::extractors::auth::Claims{sub:"owner".into(),email:"owner@test.local".into(),role:"member".into(),exp:(chrono::Utc::now().timestamp()+60)as usize};
 let token=jsonwebtoken::encode(&jsonwebtoken::Header::default(),&claims,&jsonwebtoken::EncodingKey::from_secret(b"test")).unwrap();
 let response=app.clone().oneshot(Request::builder().method("POST").uri("/api/v1/notes").header("authorization",format!("Bearer {token}")).header("content-type","application/json").body(Body::from(r#"{"title":"Personal HTTP","body":"secret"}"#)).unwrap()).await.unwrap();
 assert_eq!(response.status(),200);
 let data:serde_json::Value=serde_json::from_slice(&to_bytes(response.into_body(),1024*1024).await.unwrap()).unwrap();
 let event=events.try_recv().unwrap();assert_eq!(event.user_id.as_deref(),Some("owner"));assert_eq!(event.kind,"notes_changed");
 let claims=crate::extractors::auth::Claims{sub:"member".into(),email:"member@test.local".into(),role:"owner".into(),exp:(chrono::Utc::now().timestamp()+60)as usize};
 let token=jsonwebtoken::encode(&jsonwebtoken::Header::default(),&claims,&jsonwebtoken::EncodingKey::from_secret(b"test")).unwrap();
 for method in ["GET","PUT"] {
  let response=app.clone().oneshot(Request::builder().method(method).uri(format!("/api/v1/notes/{}",data["id"].as_str().unwrap())).header("authorization",format!("Bearer {token}")).header("content-type","application/json").body(Body::from(r#"{"version":1,"title":"Stolen"}"#)).unwrap()).await.unwrap();
  assert_eq!(response.status(),404);
 }
}

#[tokio::test]
async fn notes_all_scope_preserves_ownership_membership_roles_search_and_trash() {
    use crate::features::notes::service as n;
    let s = fixture().await;
    sqlx::query("INSERT INTO workspaces(id,name,slug,owner_id,created_at,updated_at) VALUES('w2','Second workspace','w2','other','now','now')").execute(&s.pool).await.unwrap();
    for (id, user, role) in [("w2-other", "other", "owner"), ("w2-member", "member", "viewer")] {
        sqlx::query("INSERT INTO workspace_members(id,workspace_id,user_id,role,joined_at) VALUES(?,'w2',?,?,'now')").bind(id).bind(user).bind(role).execute(&s.pool).await.unwrap();
    }
    let personal = n::create(&s,"member",serde_json::from_value(json!({"title":"Personal context"})).unwrap()).await.unwrap();
    n::create(&s,"owner",serde_json::from_value(json!({"title":"Secret context"})).unwrap()).await.unwrap();
    let shared = n::create(&s,"owner",serde_json::from_value(json!({"title":"Team context","workspace_id":"w"})).unwrap()).await.unwrap();
    let second = n::create(&s,"other",serde_json::from_value(json!({"title":"Second context","workspace_id":"w2"})).unwrap()).await.unwrap();
    let all = n::list(&s,"member",serde_json::from_value(json!({"scope":"all"})).unwrap()).await.unwrap();
    assert_eq!(all.len(),3);
    assert!(all.iter().find(|n|n.id==personal.id).unwrap().can_edit);
    assert!(all.iter().find(|n|n.id==shared.id).unwrap().can_edit);
    let view = all.iter().find(|n|n.id==second.id).unwrap();
    assert!(!view.can_edit);
    assert_eq!(view.workspace_name.as_deref(),Some("Second workspace"));
    assert!(view.body.is_none());
    assert_eq!(n::list(&s,"member",serde_json::from_value(json!({"scope":"all","q":"Second"})).unwrap()).await.unwrap().len(),1);
    assert_eq!(n::list(&s,"other",serde_json::from_value(json!({"scope":"all"})).unwrap()).await.unwrap().len(),1);
    n::update(&s,"member",&personal.id,serde_json::from_value(json!({"version":1,"trashed":true})).unwrap()).await.unwrap();
    assert_eq!(n::list(&s,"member",serde_json::from_value(json!({"scope":"all","trash":true})).unwrap()).await.unwrap()[0].id,personal.id);
    sqlx::query("DELETE FROM workspace_members WHERE workspace_id='w2' AND user_id='member'").execute(&s.pool).await.unwrap();
    assert_eq!(n::list(&s,"member",serde_json::from_value(json!({"scope":"all"})).unwrap()).await.unwrap().len(),1);
    assert!(n::get(&s,"member",&second.id).await.is_err());
    assert!(n::list(&s,"member",serde_json::from_value(json!({"scope":"all","workspace_id":"w"})).unwrap()).await.is_err());
}

#[tokio::test]
async fn notes_task_backlinks_filter_private_notes_and_require_current_task_access() {
    use crate::features::notes::service as n;
    let s = fixture().await;
    let private = n::create(&s,"owner",serde_json::from_value(json!({"title":"Private","card_id":"c1"})).unwrap()).await.unwrap();
    let shared = n::create(&s,"owner",serde_json::from_value(json!({"title":"Shared","workspace_id":"w","card_id":"c1"})).unwrap()).await.unwrap();
    assert_eq!(n::links(&s,"owner",&private.id).await.unwrap().len(),1);
    let filter = || serde_json::from_value(json!({"scope":"all","card_id":"c1"})).unwrap();
    assert_eq!(n::list(&s,"owner",filter()).await.unwrap().len(),2);
    let viewer = n::list(&s,"viewer",filter()).await.unwrap();
    assert_eq!(viewer.len(),1); assert_eq!(viewer[0].id,shared.id); assert!(!viewer[0].can_edit);
    assert!(n::list(&s,"other",filter()).await.is_err());
    assert!(n::list(&s,"owner",serde_json::from_value(json!({"scope":"all","card_id":"missing"})).unwrap()).await.is_err());
    sqlx::query("UPDATE projects SET visibility='private' WHERE id='p'").execute(&s.pool).await.unwrap();
    assert!(n::list(&s,"member",filter()).await.is_err());
    assert_eq!(n::list(&s,"owner",filter()).await.unwrap().len(),2);
    n::link(&s,"owner",&shared.id,"c1",true).await.unwrap();
    assert_eq!(n::list(&s,"owner",filter()).await.unwrap().len(),1);
    assert!(n::get(&s,"owner",&shared.id).await.is_ok());
    assert_eq!(sqlx::query_scalar::<_,i64>("SELECT count(*) FROM cards").fetch_one(&s.pool).await.unwrap(),2);
}

#[tokio::test]
async fn notes_create_with_task_validates_before_writing_and_preserves_links_in_trash() {
    use crate::features::notes::service as n;
    let s=fixture().await;
    for (user, payload) in [
        ("other",json!({"title":"Blocked","card_id":"c1"})),
        ("viewer",json!({"title":"Blocked","workspace_id":"w","card_id":"c1"})),
        ("owner",json!({"title":"Blocked","card_id":"missing"})),
    ] {
        assert!(n::create(&s,user,serde_json::from_value(payload).unwrap()).await.is_err());
    }
    assert_eq!(sqlx::query_scalar::<_,i64>("SELECT count(*) FROM notes").fetch_one(&s.pool).await.unwrap(),0);
    sqlx::query("INSERT INTO workspaces(id,name,slug,owner_id,created_at,updated_at) VALUES('w2','Other workspace','w2','owner','now','now')").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO workspace_members(id,workspace_id,user_id,role,joined_at) VALUES('w2-owner','w2','owner','owner','now')").execute(&s.pool).await.unwrap();
    assert!(n::create(&s,"owner",serde_json::from_value(json!({"title":"Wrong workspace","workspace_id":"w2","card_id":"c1"})).unwrap()).await.is_err());
    assert_eq!(sqlx::query_scalar::<_,i64>("SELECT count(*) FROM notes").fetch_one(&s.pool).await.unwrap(),0);
    let note=n::create(&s,"viewer",serde_json::from_value(json!({"title":"My context","card_id":"c1"})).unwrap()).await.unwrap();
    n::update(&s,"viewer",&note.id,serde_json::from_value(json!({"version":1,"trashed":true})).unwrap()).await.unwrap();
    let filter=||serde_json::from_value(json!({"scope":"all","card_id":"c1"})).unwrap();
    assert!(n::list(&s,"viewer",filter()).await.unwrap().is_empty());
    assert_eq!(n::links(&s,"viewer",&note.id).await.unwrap().len(),1);
    n::update(&s,"viewer",&note.id,serde_json::from_value(json!({"version":2,"trashed":false})).unwrap()).await.unwrap();
    assert_eq!(n::list(&s,"viewer",filter()).await.unwrap().len(),1);
}

#[tokio::test]
async fn dashboard_scopes_totals_projects_and_write_capabilities_to_current_access() {
    use super::dashboard::service as d;
    let s=fixture().await;
    assert!(d::get(&s,"other","w","2026-10-22").await.is_err());
    let dashboard=d::get(&s,"member","w","2026-10-22").await.unwrap();
    assert_eq!(dashboard.summary.tasks,2); assert_eq!(dashboard.summary.pending,1); assert_eq!(dashboard.summary.completed,1);
    assert!(dashboard.projects[0].can_write);
    assert!(!d::get(&s,"viewer","w","2026-10-22").await.unwrap().projects[0].can_write);
    sqlx::query("UPDATE projects SET visibility='private' WHERE id='p'").execute(&s.pool).await.unwrap();
    let hidden=d::get(&s,"member","w","2026-10-22").await.unwrap();
    assert_eq!(hidden.summary.tasks,0); assert_eq!(hidden.summary.projects,0); assert!(hidden.projects.is_empty());
    sqlx::query("INSERT INTO project_members(id,project_id,user_id,role,joined_at) VALUES('pm','p','member','viewer','now')").execute(&s.pool).await.unwrap();
    assert!(!d::get(&s,"member","w","2026-10-22").await.unwrap().projects[0].can_write);
    assert_eq!(d::get(&s,"owner","w","2026-10-22").await.unwrap().summary.tasks,2);
    sqlx::query("DELETE FROM workspace_members WHERE user_id='member'").execute(&s.pool).await.unwrap();
    assert!(d::get(&s,"member","w","2026-10-22").await.is_err());
    for day in ["2026-02-30","2026-1-2","nonsense"] { assert!(d::get(&s,"owner","w",day).await.is_err()); }
}

#[tokio::test]
async fn dashboard_bounds_previews_without_truncating_totals_and_groups_calendar_days() {
    use super::dashboard::service as d;
    let s=fixture().await;
    for i in 0..9 {
        let id=format!("overdue-{i}");
        sqlx::query("INSERT INTO cards(id,project_id,column_id,title,priority,position,due_date,created_at,updated_at) VALUES(?,'p','todo','Overdue','urgent',1,'2026-10-21','now','now')").bind(&id).execute(&s.pool).await.unwrap();
        sqlx::query("INSERT INTO card_assignees(card_id,user_id) VALUES(?,'member')").bind(&id).execute(&s.pool).await.unwrap();
    }
    sqlx::query("UPDATE cards SET due_date='2026-10-22T23:30:00-03:00' WHERE id='c1'").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO card_assignees(card_id,user_id) VALUES('c1','member')").execute(&s.pool).await.unwrap();
    let first=d::get(&s,"member","w","2026-10-22").await.unwrap();
    assert_eq!(first.summary.tasks,11); assert_eq!(first.summary.overdue,9); assert_eq!(first.summary.mine,10);
    assert_eq!(first.mine_overdue.len(),6); assert_eq!(first.attention.len(),6);
    assert_eq!(first.mine_today.len(),1); assert_eq!(first.deadlines.len(),1);
    assert!(first.mine_upcoming.is_empty()); assert_eq!(first.projects[0].total,11);
    sqlx::query("UPDATE cards SET due_date='2026-10-29' WHERE id='c1'").execute(&s.pool).await.unwrap();
    assert!(d::get(&s,"member","w","2026-10-22").await.unwrap().deadlines.is_empty());
    sqlx::query("UPDATE cards SET due_date='2026-10-28' WHERE id='c1'").execute(&s.pool).await.unwrap();
    assert_eq!(d::get(&s,"member","w","2026-10-22").await.unwrap().deadlines.len(),1);
    sqlx::query("UPDATE cards SET archived_at='now' WHERE id='c1'").execute(&s.pool).await.unwrap();
    assert_eq!(d::get(&s,"member","w","2026-10-22").await.unwrap().summary.mine,9);
    sqlx::query("UPDATE projects SET archived_at='now' WHERE id='p'").execute(&s.pool).await.unwrap();
    assert_eq!(d::get(&s,"member","w","2026-10-22").await.unwrap().summary.tasks,0);
}

#[tokio::test]
async fn dashboard_pins_and_activity_never_expose_private_notes_or_raw_audit_payloads() {
    use super::dashboard::service as d;
    use crate::features::notes::service as n;
    let s=fixture().await;
    for (user,workspace,title) in [("owner",None,"Private secret"),("member",None,"My pin"),("owner",Some("w"),"Team pin")] {
        let note=n::create(&s,user,serde_json::from_value(json!({"title":title,"workspace_id":workspace})).unwrap()).await.unwrap();
        n::update(&s,user,&note.id,serde_json::from_value(json!({"version":1,"pinned":true})).unwrap()).await.unwrap();
    }
    sqlx::query("INSERT INTO activities(id,workspace_id,project_id,card_id,actor_id,action,payload,created_at) VALUES('activity','w','p','c1','owner','updated_card','{\"password\":\"private-audit-value\"}','now')").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO card_links(id,source_card_id,target_card_id,link_type) VALUES('l','c2','c1','blocks')").execute(&s.pool).await.unwrap();
    let data=d::get(&s,"member","w","2026-10-22").await.unwrap();
    assert_eq!(data.notes.len(),2); assert_eq!(data.activity.len(),1);
    assert_eq!(data.summary.blocked,0); // Completed blockers do not block work.
    let text=serde_json::to_string(&data).unwrap();
    assert!(!text.contains("Private secret")); assert!(!text.contains("private-audit-value"));
    sqlx::query("UPDATE cards SET column_id='todo' WHERE id='c2'").execute(&s.pool).await.unwrap();
    assert_eq!(d::get(&s,"member","w","2026-10-22").await.unwrap().summary.blocked,1);
    sqlx::query("UPDATE projects SET visibility='private' WHERE id='p'").execute(&s.pool).await.unwrap();
    let hidden=d::get(&s,"member","w","2026-10-22").await.unwrap();
    assert!(hidden.activity.is_empty()); assert!(hidden.attention.is_empty());
}

#[tokio::test]
async fn dashboard_http_authentication_workspace_switching_and_templates() {
    use super::dashboard::service as d;
    use axum::{body::Body,http::Request};
    use tower::ServiceExt;
    let s=fixture().await;
    sqlx::query("INSERT INTO workspaces(id,name,slug,owner_id,created_at,updated_at) VALUES('w2','Second','w2','owner','now','now')").execute(&s.pool).await.unwrap();
    sqlx::query("INSERT INTO workspace_members(id,workspace_id,user_id,role,joined_at) VALUES('w2-owner','w2','owner','owner','now')").execute(&s.pool).await.unwrap();
    assert_eq!(d::get(&s,"owner","w2","2026-10-22").await.unwrap().summary.tasks,0);
    sqlx::query("UPDATE cards SET is_template=1 WHERE id='c1'").execute(&s.pool).await.unwrap();
    assert_eq!(d::get(&s,"owner","w","2026-10-22").await.unwrap().summary.tasks,1);
    let app=crate::router::create_router(s.clone());
    let uri="/api/v1/enterprise/workspaces/w/dashboard?today=2026-10-22";
    let response=app.clone().oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(response.status(),401);
    for (user,status) in [("other",403),("viewer",200)] {
        let claims=crate::extractors::auth::Claims{sub:user.into(),email:format!("{user}@test.local"),role:"owner".into(),exp:(chrono::Utc::now().timestamp()+60)as usize};
        let token=jsonwebtoken::encode(&jsonwebtoken::Header::default(),&claims,&jsonwebtoken::EncodingKey::from_secret(b"test")).unwrap();
        let response=app.clone().oneshot(Request::builder().uri(uri).header("authorization",format!("Bearer {token}")).body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(response.status(),status);
    }
}
