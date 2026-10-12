ALTER TABLE comments ADD COLUMN is_internal INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_internal_comments ON comments(card_id,is_internal);
