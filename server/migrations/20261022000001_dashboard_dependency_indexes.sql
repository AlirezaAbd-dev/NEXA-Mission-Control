CREATE INDEX IF NOT EXISTS idx_card_links_target_type ON card_links(target_card_id, link_type);
CREATE INDEX IF NOT EXISTS idx_card_links_source_type ON card_links(source_card_id, link_type);
