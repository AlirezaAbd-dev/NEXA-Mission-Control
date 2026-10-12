CREATE TABLE board_mirrors(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,created_at TEXT NOT NULL,UNIQUE(project_id,card_id));
CREATE INDEX idx_mirror_project ON board_mirrors(project_id);
CREATE INDEX idx_mirror_card ON board_mirrors(card_id);
