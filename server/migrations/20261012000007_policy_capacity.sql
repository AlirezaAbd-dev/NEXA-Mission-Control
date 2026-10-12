CREATE TABLE project_member_permissions(project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,capability TEXT NOT NULL,allowed INTEGER NOT NULL,PRIMARY KEY(project_id,capability));
CREATE TABLE team_capacity(workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,weekly_hours REAL NOT NULL DEFAULT 40,PRIMARY KEY(workspace_id,user_id));
CREATE INDEX idx_capacity_user ON team_capacity(user_id);
