use crate::{error::AppError, features::search::dto::SearchResultItem};
use sqlx::{QueryBuilder, Sqlite, SqlitePool};
#[derive(Default)]
pub struct SearchFilters {
    pub text: String,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub label: Option<String>,
    pub overdue: Option<bool>,
    pub project: Option<String>,
}
pub struct SearchRepository;
impl SearchRepository {
    pub async fn search_expression(
        pool: &SqlitePool,
        expr: &super::expression::Expr,
        user: &str,
    ) -> Result<Vec<SearchResultItem>, AppError> {
        let mut qb=QueryBuilder::<Sqlite>::new("SELECT c.id,c.project_id,p.name,c.title,c.description,c.priority FROM cards c JOIN projects p ON p.id=c.project_id JOIN columns col ON col.id=c.column_id JOIN workspace_members wm ON wm.workspace_id=p.workspace_id WHERE c.archived_at IS NULL AND wm.user_id=");
        qb.push_bind(user);
        qb.push(" AND (p.visibility='public' OR wm.role IN ('owner','admin') OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=wm.user_id)) AND (");
        super::expression::push(&mut qb, expr, user)?;
        qb.push(") ORDER BY c.updated_at DESC LIMIT 100");
        let rows = qb
            .build_query_as::<(String, String, String, String, Option<String>, String)>()
            .fetch_all(pool)
            .await?;
        Ok(rows
            .into_iter()
            .map(
                |(card_id, project_id, project_name, title, description, priority)| {
                    SearchResultItem {
                        card_id,
                        project_id,
                        project_name,
                        title,
                        description,
                        priority,
                    }
                },
            )
            .collect())
    }
    pub async fn search_cards(
        pool: &SqlitePool,
        f: &SearchFilters,
        user: &str,
    ) -> Result<Vec<SearchResultItem>, AppError> {
        let mut qb=QueryBuilder::<Sqlite>::new("SELECT c.id,c.project_id,p.name,c.title,c.description,c.priority FROM cards c JOIN projects p ON p.id=c.project_id JOIN columns col ON col.id=c.column_id JOIN workspace_members wm ON wm.workspace_id=p.workspace_id WHERE c.archived_at IS NULL AND wm.user_id=");
        qb.push_bind(user);
        qb.push(" AND (p.visibility='public' OR wm.role IN ('owner','admin') OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=wm.user_id))");
        if !f.text.is_empty() {
            let expression = f
                .text
                .split_whitespace()
                .map(|t| format!("\"{}\"", t.replace('"', "\"\"")))
                .collect::<Vec<_>>()
                .join(" AND ");
            qb.push(" AND c.id IN(SELECT id FROM cards_fts WHERE cards_fts MATCH ")
                .push_bind(expression)
                .push(")");
        }
        if let Some(p) = &f.priority {
            qb.push(" AND c.priority=").push_bind(p);
        }
        if let Some(status) = &f.status {
            qb.push(" AND col.type=").push_bind(status);
        }
        if let Some(assignee) = &f.assignee {
            qb.push(" AND EXISTS(SELECT 1 FROM card_assignees ca JOIN users u ON u.id=ca.user_id WHERE ca.card_id=c.id AND (u.id=").push_bind(assignee).push(" OR u.username=").push_bind(assignee).push("))");
        }
        if let Some(label) = &f.label {
            qb.push(" AND EXISTS(SELECT 1 FROM card_labels cl JOIN labels l ON l.id=cl.label_id WHERE cl.card_id=c.id AND (l.id=").push_bind(label).push(" OR l.name=").push_bind(label).push("))");
        }
        if let Some(p) = &f.project {
            qb.push(" AND (p.id=")
                .push_bind(p)
                .push(" OR p.identifier=")
                .push_bind(p)
                .push(")");
        }
        if let Some(overdue) = f.overdue {
            qb.push(if overdue{" AND c.due_date IS NOT NULL AND substr(c.due_date,1,10)<date('now') AND col.type!='done'"}else{" AND (c.due_date IS NULL OR substr(c.due_date,1,10)>=date('now') OR col.type='done')"});
        }
        qb.push(" ORDER BY c.updated_at DESC LIMIT 100");
        let rows = qb
            .build_query_as::<(String, String, String, String, Option<String>, String)>()
            .fetch_all(pool)
            .await?;
        Ok(rows
            .into_iter()
            .map(
                |(card_id, project_id, project_name, title, description, priority)| {
                    SearchResultItem {
                        card_id,
                        project_id,
                        project_name,
                        title,
                        description,
                        priority,
                    }
                },
            )
            .collect())
    }
}
