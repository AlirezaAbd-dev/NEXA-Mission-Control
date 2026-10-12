ALTER TABLE cards ADD COLUMN sla_response_due_at TEXT;
ALTER TABLE cards ADD COLUMN first_response_at TEXT;
ALTER TABLE cards ADD COLUMN resolved_at TEXT;
CREATE INDEX idx_cards_sla_response ON cards(sla_response_due_at,first_response_at);
CREATE INDEX idx_cards_sla_resolution ON cards(sla_due_at,resolved_at);
