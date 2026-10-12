CREATE TABLE epics (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 name TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '#0d9488',
 status TEXT NOT NULL DEFAULT 'planned', start_date TEXT, target_date TEXT, created_at TEXT NOT NULL
);
CREATE INDEX idx_epics_project ON epics(project_id);
CREATE TABLE releases (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'unreleased', target_date TEXT, created_at TEXT NOT NULL
);
CREATE INDEX idx_releases_project ON releases(project_id);
ALTER TABLE cards ADD COLUMN epic_id TEXT REFERENCES epics(id) ON DELETE SET NULL;
ALTER TABLE cards ADD COLUMN parent_id TEXT REFERENCES cards(id) ON DELETE SET NULL;
ALTER TABLE cards ADD COLUMN release_id TEXT REFERENCES releases(id) ON DELETE SET NULL;
ALTER TABLE cards ADD COLUMN sla_due_at TEXT;
CREATE INDEX idx_cards_epic ON cards(epic_id);
CREATE INDEX idx_cards_parent ON cards(parent_id);
CREATE INDEX idx_cards_release ON cards(release_id);
CREATE TABLE saved_views (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, config_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX idx_saved_views_project ON saved_views(project_id,user_id);
CREATE INDEX idx_saved_views_user ON saved_views(user_id);
CREATE TABLE board_preferences (
 project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 config_json TEXT NOT NULL DEFAULT '{}', PRIMARY KEY(project_id,user_id)
);
CREATE INDEX idx_board_preferences_user ON board_preferences(user_id);
CREATE TABLE automation_rules (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 name TEXT NOT NULL, trigger_type TEXT NOT NULL, trigger_config_json TEXT NOT NULL DEFAULT '{}',
 action_type TEXT NOT NULL, action_config_json TEXT NOT NULL DEFAULT '{}', is_active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL
);
CREATE INDEX idx_rules_project ON automation_rules(project_id,is_active);
CREATE TABLE automation_runs (
 id TEXT PRIMARY KEY, rule_id TEXT NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
 card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE, event_key TEXT NOT NULL,
 created_at TEXT NOT NULL, UNIQUE(rule_id,card_id,event_key)
);
CREATE INDEX idx_automation_runs_card ON automation_runs(card_id);
CREATE TABLE sprint_snapshots (
 sprint_id TEXT NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
 day TEXT NOT NULL, committed_points REAL NOT NULL, remaining_points REAL NOT NULL,
 PRIMARY KEY(sprint_id,day)
);
ALTER TABLE sprints ADD COLUMN committed_points REAL NOT NULL DEFAULT 0;
ALTER TABLE sprints ADD COLUMN completed_points REAL NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX idx_one_active_sprint ON sprints(project_id) WHERE status='active';
CREATE TABLE api_tokens (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
CREATE TABLE project_integrations (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 kind TEXT NOT NULL, name TEXT NOT NULL, config_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX idx_integrations_project ON project_integrations(project_id);
CREATE TABLE document_links (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 card_id TEXT REFERENCES cards(id) ON DELETE CASCADE, name TEXT NOT NULL, kind TEXT NOT NULL, url TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX idx_documents_project ON document_links(project_id);
CREATE INDEX idx_documents_card ON document_links(card_id);
