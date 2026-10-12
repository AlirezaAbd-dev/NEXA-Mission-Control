use crate::{extractors::auth::AuthUser, state::AppState};
use axum::{
    extract::{
        ws::{Message, WebSocket},
        FromRequestParts,
    },
    http::{header, Request},
};
use std::time::Duration;
pub async fn connect(s: AppState, mut socket: WebSocket) {
    // Authenticate in the first frame, keeping credentials out of URLs/access logs.
    let token = match tokio::time::timeout(Duration::from_secs(5), socket.recv()).await {
        Ok(Some(Ok(Message::Text(t)))) => serde_json::from_str::<serde_json::Value>(&t)
            .ok()
            .and_then(|v| v.get("token").and_then(|t| t.as_str()).map(str::to_owned)),
        _ => None,
    };
    let Some(token) = token else {
        let _ = socket.send(Message::Close(None)).await;
        return;
    };
    let Ok(req) = Request::builder()
        .header(header::AUTHORIZATION, format!("Bearer {token}"))
        .body(())
    else {
        return;
    };
    let (mut parts, _) = req.into_parts();
    let Ok(auth) = AuthUser::from_request_parts(&mut parts, &s).await else {
        let _ = socket.send(Message::Close(None)).await;
        return;
    };
    let mut events = s.changes.subscribe();
    let _ = socket
        .send(Message::Text("{\"kind\":\"connected\"}".into()))
        .await;
    let mut heartbeat = tokio::time::interval(Duration::from_secs(25));
    loop {
        tokio::select! {
         frame=socket.recv()=>match frame{Some(Ok(Message::Close(_)))|None|Some(Err(_))=>break,_=>{}},
         _=heartbeat.tick()=>{
          // Revalidate expired JWTs and revoked PATs, plus membership on every event.
          if AuthUser::from_request_parts(&mut parts,&s).await.is_err(){break;}
          if socket.send(Message::Ping(vec![].into())).await.is_err(){break;}
         },
         event=events.recv()=>{
          let change=match event{Ok(change)=>change,Err(tokio::sync::broadcast::error::RecvError::Lagged(_))=>super::Change{project_id:None,user_id:Some(auth.id.clone()),kind:"resync".into()},Err(_)=>break};
          let visible=if matches!(change.kind.as_str(),"permissions_changed"|"workspace_changed"){true}else if let Some(p)=&change.project_id{super::repository::allowed(&s.pool,p,&auth.id).await}else{change.user_id.as_deref()==Some(auth.id.as_str())};
          if visible{if let Ok(json)=serde_json::to_string(&change){if socket.send(Message::Text(json.into())).await.is_err(){break;}}}
         }
        }
    }
    let _ = socket.send(Message::Close(None)).await;
}
