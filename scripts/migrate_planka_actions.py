import os
import sys
import json
import uuid
import datetime
import paramiko

SERVER_IP = "130.185.78.131"
USERNAME = "root"
PASSWORD = "in9o89rvhJcskRjZ"

WORKSPACE_ID = "f3dc0cfe-166c-4694-8fda-00bc5bee2dbb"
PROJECT_ID = "135dfb38-cde0-4a81-8c72-432648e4a5b2"

USER_MAP = {
    "1882161391024997377": "9aed1560-a3c4-435e-bafa-9f55d0dd5647", # alirezaabd
    "1882169462635889667": "de24de75-2f58-43f1-86e0-278c5562f4a1", # sajjad
}

def main():
    print(f"Connecting to VPS {SERVER_IP}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, username=USERNAME, password=PASSWORD, timeout=15)
    print("SSH connected!")

    def q_pg(sql):
        wrapped = f"SELECT json_agg(t) FROM ({sql}) t;"
        stdin, stdout, stderr = ssh.exec_command(f'docker exec temp-planka-db psql -U postgres -d planka -t -A -c "{wrapped}"')
        res = stdout.read().decode().strip()
        return json.loads(res) if res else []

    # 1. Fetch Planka cards
    planka_cards = q_pg("SELECT id::text, name FROM card")
    planka_card_name_by_id = {c["id"]: c["name"] for c in planka_cards}

    # 2. Fetch SQLite cards via host python3
    stdin, stdout, stderr = ssh.exec_command(
        """python3 -c 'import sqlite3, json; con = sqlite3.connect("/opt/planka/data/mission-control.db"); cur = con.cursor(); cur.execute("SELECT id, title FROM cards"); print(json.dumps(cur.fetchall()))'"""
    )
    sqlite_cards_raw = stdout.read().decode().strip()
    sqlite_cards = json.loads(sqlite_cards_raw)
    sqlite_card_map = {title.strip(): cid for cid, title in sqlite_cards}
    print(f"Loaded {len(sqlite_card_map)} SQLite cards from host DB.")

    # 3. Fetch all Planka actions
    actions = q_pg("SELECT id::text, type, data, created_at::text, card_id::text, user_id::text FROM action ORDER BY created_at ASC")
    print(f"Extracted {len(actions)} actions from Planka.")

    # 4. Prepare insert records
    insert_records = []
    unmapped = 0
    for a in actions:
        p_card_id = a.get("card_id")
        card_name = planka_card_name_by_id.get(p_card_id)
        if not card_name:
            print(f"Warning: Planka card {p_card_id} not found in Planka cards!")
            unmapped += 1
            continue

        sqlite_card_id = sqlite_card_map.get(card_name.strip())
        if not sqlite_card_id:
            print(f"Warning: Card '{card_name}' not mapped to SQLite!")
            unmapped += 1
            continue

        actor_id = USER_MAP.get(a.get("user_id"), "9aed1560-a3c4-435e-bafa-9f55d0dd5647")
        action_type = a.get("type")
        data = a.get("data") or {}

        # Format ISO timestamp: "2026-10-09 17:36:57.999" -> "2026-10-09T17:36:57.999Z"
        raw_ts = a.get("created_at")
        try:
            dt = datetime.datetime.fromisoformat(raw_ts)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=datetime.timezone.utc)
            created_at_iso = dt.isoformat()
        except Exception:
            created_at_iso = raw_ts.replace(" ", "T") + "Z"

        rec_id = str(uuid.uuid4())

        if action_type == "createCard":
            mc_action = "created_card"
            col_name = data.get("list", {}).get("name", "")
            payload = {"title": card_name, "column": col_name}
        elif action_type == "moveCard":
            mc_action = "moved_card"
            from_col = data.get("fromList", {}).get("name", "")
            to_col = data.get("toList", {}).get("name", "")
            payload = {
                "from_column": from_col,
                "to_column": to_col,
                "changes": {
                    "status": {
                        "before": from_col,
                        "after": to_col
                    }
                }
            }
        elif action_type == "addMemberToCard":
            mc_action = "member_added"
            user_name = data.get("user", {}).get("name", "")
            payload = {"assignee": user_name}
        elif action_type == "removeMemberFromCard":
            mc_action = "member_removed"
            user_name = data.get("user", {}).get("name", "")
            payload = {"removed_assignee": user_name}
        else:
            mc_action = action_type
            payload = data

        insert_records.append((
            rec_id,
            WORKSPACE_ID,
            PROJECT_ID,
            sqlite_card_id,
            actor_id,
            mc_action,
            json.dumps(payload),
            created_at_iso
        ))

    print(f"Prepared {len(insert_records)} records to insert (unmapped: {unmapped}).")

    # 5. Insert records into SQLite on VPS
    insert_script = f"""import sqlite3
import json

records = {json.dumps(insert_records)}

con = sqlite3.connect("/opt/planka/data/mission-control.db")
cur = con.cursor()

inserted = 0
for r in records:
    # check if duplicate by (card_id, action, created_at)
    cur.execute("SELECT 1 FROM activities WHERE card_id = ? AND action = ? AND created_at = ?", (r[3], r[5], r[7]))
    if cur.fetchone():
        continue
    cur.execute(
        "INSERT INTO activities (id, workspace_id, project_id, card_id, actor_id, action, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        r
    )
    inserted += 1

con.commit()
print(f"Successfully inserted {{inserted}} new activities into mission-control.db!")
cur.execute("SELECT count(*) FROM activities")
print(f"Total activities in DB: {{cur.fetchone()[0]}}")
con.close()
"""
    sftp = ssh.open_sftp()
    with sftp.file("/tmp/insert_activities.py", "w") as f:
        f.write(insert_script)
    sftp.close()

    stdin, stdout, stderr = ssh.exec_command("python3 /tmp/insert_activities.py")
    print("Execution output:")
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print("Errors:", err)

    # 6. Stop and remove temp-planka-db
    print("Stopping temporary Postgres container...")
    ssh.exec_command("docker rm -f temp-planka-db")
    print("Cleanup done!")

    ssh.close()
    print("All migration finished successfully!")

if __name__ == "__main__":
    main()
