CREATE TABLE development_links(id TEXT PRIMARY KEY,card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,integration_id TEXT NOT NULL REFERENCES project_integrations(id) ON DELETE CASCADE,kind TEXT NOT NULL,external_id TEXT NOT NULL,title TEXT NOT NULL,url TEXT NOT NULL,state TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(card_id,integration_id,kind,external_id));
CREATE INDEX idx_development_card ON development_links(card_id);
CREATE INDEX idx_development_integration ON development_links(integration_id);
