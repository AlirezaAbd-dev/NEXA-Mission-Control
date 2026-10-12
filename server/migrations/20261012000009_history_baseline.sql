INSERT INTO card_status_history(id,card_id,project_id,column_id,entered_at)
SELECT c.id,c.id,c.project_id,c.column_id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM cards c
WHERE NOT EXISTS(SELECT 1 FROM card_status_history h WHERE h.card_id=c.id);
