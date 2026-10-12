CREATE TABLE webhook_receipts (
 integration_id TEXT NOT NULL REFERENCES project_integrations(id) ON DELETE CASCADE,
 delivery_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(integration_id,delivery_id)
);
CREATE TABLE oidc_sessions (
 id TEXT PRIMARY KEY, nonce TEXT NOT NULL, verifier TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE oidc_identities (
 issuer TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 PRIMARY KEY(issuer,subject)
);
CREATE INDEX idx_oidc_identity_user ON oidc_identities(user_id);
