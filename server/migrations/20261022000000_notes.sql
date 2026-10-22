CREATE TABLE notes (
 id TEXT PRIMARY KEY,
 owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
 workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 title TEXT NOT NULL,
 body TEXT NOT NULL DEFAULT '',
 pinned INTEGER NOT NULL DEFAULT 0,
 version INTEGER NOT NULL DEFAULT 1,
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 CHECK ((owner_id IS NOT NULL AND workspace_id IS NULL) OR (owner_id IS NULL AND workspace_id IS NOT NULL))
);
CREATE INDEX idx_notes_owner ON notes(owner_id,deleted_at,pinned,updated_at);
CREATE INDEX idx_notes_workspace ON notes(workspace_id,deleted_at,pinned,updated_at);
CREATE INDEX idx_notes_creator ON notes(created_by);
CREATE TABLE note_links (
 note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
 card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
 PRIMARY KEY(note_id,card_id)
);
CREATE INDEX idx_note_links_card ON note_links(card_id);
CREATE VIRTUAL TABLE notes_fts USING fts5(title,body,content='notes',content_rowid='rowid',tokenize='unicode61');
CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
 INSERT INTO notes_fts(rowid,title,body) VALUES(new.rowid,new.title,new.body);
END;
CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
 INSERT INTO notes_fts(notes_fts,rowid,title,body) VALUES('delete',old.rowid,old.title,old.body);
END;
CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN
 INSERT INTO notes_fts(notes_fts,rowid,title,body) VALUES('delete',old.rowid,old.title,old.body);
 INSERT INTO notes_fts(rowid,title,body) VALUES(new.rowid,new.title,new.body);
END;
