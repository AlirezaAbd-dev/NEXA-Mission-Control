-- Initial Schema Migration for TaskFlow

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
  joined_at TEXT NOT NULL,
  UNIQUE(workspace_id, user_id)
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  identifier TEXT NOT NULL, -- e.g. "NEX"
  description TEXT,
  color TEXT,
  cover_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'public', -- 'public', 'private'
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Project Members
CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member', 'viewer'
  joined_at TEXT NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Boards
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Columns
CREATE TABLE IF NOT EXISTS columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'active', -- 'backlog', 'active', 'done', 'archive'
  position REAL NOT NULL,
  wip_limit INTEGER,
  created_at TEXT NOT NULL
);

-- Cards
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'no_priority', -- 'urgent', 'high', 'medium', 'low', 'no_priority'
  position REAL NOT NULL,
  creator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_date TEXT,
  start_date TEXT,
  estimated_hours REAL,
  cover_url TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Card Assignees
CREATE TABLE IF NOT EXISTS card_assignees (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);

-- Labels
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Card Labels
CREATE TABLE IF NOT EXISTS card_labels (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

-- Checklists
CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position REAL NOT NULL,
  created_at TEXT NOT NULL
);

-- Checklist Items
CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done INTEGER NOT NULL DEFAULT 0,
  position REAL NOT NULL,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_date TEXT,
  created_at TEXT NOT NULL
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  edited_at TEXT,
  created_at TEXT NOT NULL
);

-- Reactions
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  UNIQUE(comment_id, user_id, emoji)
);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  uploader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Card Relationships / Links
CREATE TABLE IF NOT EXISTS card_links (
  id TEXT PRIMARY KEY,
  source_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  target_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL -- 'blocks', 'blocked_by', 'relates_to', 'duplicates'
);

-- Sprints
CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'active', 'completed'
  created_at TEXT NOT NULL
);

-- Sprint Cards
CREATE TABLE IF NOT EXISTS sprint_cards (
  sprint_id TEXT NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL,
  PRIMARY KEY (sprint_id, card_id)
);

-- Time Logs
CREATE TABLE IF NOT EXISTS time_logs (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  minutes INTEGER NOT NULL,
  logged_at TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  card_id TEXT,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  read_at TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);
CREATE INDEX IF NOT EXISTS idx_columns_board_pos ON columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_column_pos ON cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_project ON cards(project_id);
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);
CREATE INDEX IF NOT EXISTS idx_cards_archived ON cards(archived_at);
CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
CREATE INDEX IF NOT EXISTS idx_activities_workspace ON activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_card ON activities(card_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);

-- Full-Text Search (FTS5) for fast, responsive card and search queries
CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
  id UNINDEXED,
  title,
  description
);

-- Sync Triggers for FTS
CREATE TRIGGER IF NOT EXISTS trg_cards_fts_ai AFTER INSERT ON cards BEGIN
  INSERT INTO cards_fts(id, title, description)
  VALUES (new.id, new.title, COALESCE(new.description, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_cards_fts_ad AFTER DELETE ON cards BEGIN
  DELETE FROM cards_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_cards_fts_au AFTER UPDATE ON cards BEGIN
  DELETE FROM cards_fts WHERE id = old.id;
  INSERT INTO cards_fts(id, title, description)
  VALUES (new.id, new.title, COALESCE(new.description, ''));
END;
