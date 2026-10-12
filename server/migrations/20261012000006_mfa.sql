CREATE TABLE user_mfa(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,secret TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 0,pending_until INTEGER NOT NULL,last_counter INTEGER NOT NULL DEFAULT -1,failed_attempts INTEGER NOT NULL DEFAULT 0,locked_until INTEGER NOT NULL DEFAULT 0);
CREATE TABLE mfa_recovery_codes(code_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX idx_mfa_recovery_user ON mfa_recovery_codes(user_id);
