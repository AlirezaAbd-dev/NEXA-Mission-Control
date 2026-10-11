-- Phase 1 Enterprise Enhancements: Watchers, Card Relations, Card Votes, Custom Fields, Templates, and Active Timer

-- 1. Card Watchers (Subscriptions)
CREATE TABLE IF NOT EXISTS card_watchers (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (card_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_card_watchers_user ON card_watchers(user_id);

-- 2. Card Votes (Kudos / Voting)
CREATE TABLE IF NOT EXISTS card_votes (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (card_id, user_id)
);

-- 3. Custom Field Definitions & Values
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'text', 'number', 'currency', 'dropdown', 'checkbox', 'date'
  options_json TEXT NOT NULL DEFAULT '[]',
  position REAL NOT NULL DEFAULT 1000.0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_custom_fields_project ON custom_field_definitions(project_id);

CREATE TABLE IF NOT EXISTS custom_field_values (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(card_id, field_id)
);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_card ON custom_field_values(card_id);

-- 4. Active Live Timer State for Time Tracking / Stopwatch
CREATE TABLE IF NOT EXISTS active_timers (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  description TEXT,
  UNIQUE(card_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_active_timers_user ON active_timers(user_id);

-- 5. Card Templates & Story Points support on cards
ALTER TABLE cards ADD COLUMN is_template INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cards ADD COLUMN story_points REAL;
