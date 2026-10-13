import os
import sys
import json
import uuid
import datetime
import sqlite3
import paramiko

SERVER_IP = "130.185.78.131"
USERNAME = "root"
PASSWORD = "in9o89rvhJcskRjZ"

ARGON2_HASH_123456 = "$argon2id$v=19$m=19456,t=2,p=1$gYPnGncHzgvlmJ9iqWvYYA$1X8cisJeAgNHaXzS4beagp6j++QYUP1HssuGrWdiiEg"

def main():
    print(f"Connecting to VPS {SERVER_IP}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, username=USERNAME, password=PASSWORD, timeout=15)
    print("SSH connected successfully!")

    # Helper function to run Postgres query inside planka-db container and return JSON
    def query_pg_json(sql):
        wrapped = f"SELECT json_agg(t) FROM ({sql}) t;"
        stdin, stdout, stderr = ssh.exec_command(f'docker exec planka-db psql -U postgres -d planka -t -A -c "{wrapped}"')
        raw = stdout.read().decode().strip()
        if not raw or raw == "":
            return []
        try:
            return json.loads(raw)
        except Exception as e:
            print(f"Failed to parse JSON for query: {sql}\nRaw: {raw}\nError: {e}")
            raise e

    print("Extracting users from Planka...")
    users = query_pg_json("SELECT id::text, email, username, name FROM user_account ORDER BY id")
    print(f"Extracted {len(users)} users: {[u['username'] for u in users]}")

    print("Extracting project and boards...")
    projects = query_pg_json("SELECT id::text, name, description FROM project")
    boards = query_pg_json("SELECT id::text, project_id::text, name, position FROM board ORDER BY position")
    lists = query_pg_json("SELECT id::text, board_id::text, name, position, type FROM list ORDER BY position")
    cards = query_pg_json("SELECT id::text, board_id::text, list_id::text, creator_user_id::text, name, description, position, created_at::text, updated_at::text FROM card ORDER BY position")
    card_memberships = query_pg_json("SELECT card_id::text, user_id::text FROM card_membership")
    comments = query_pg_json("SELECT id::text, card_id::text, user_id::text, text, created_at::text, updated_at::text FROM comment")

    print(f"Extraction summary:")
    print(f"  Projects: {len(projects)}")
    print(f"  Boards: {len(boards)}")
    print(f"  Lists: {len(lists)}")
    print(f"  Cards: {len(cards)}")
    print(f"  Card memberships: {len(card_memberships)}")
    print(f"  Comments: {len(comments)}")

    # Copy attachments from inside planka container to /opt/planka/uploads on host
    print("Backing up uploaded files from planka container...")
    ssh.exec_command("mkdir -p /opt/planka/uploads /opt/planka/data")
    ssh.exec_command("docker cp planka:/app/.tmp/uploads/. /opt/planka/uploads/")
    stdin, stdout, stderr = ssh.exec_command("ls -la /opt/planka/uploads")
    print("Host /opt/planka/uploads contents:")
    print(stdout.read().decode())

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Create local sqlite database
    local_db_path = "/tmp/mission_control_migrated.db"
    if os.path.exists(local_db_path):
        os.remove(local_db_path)

    # Copy schema from existing taskflow.db migrations
    con = sqlite3.connect(local_db_path)
    cur = con.cursor()

    # Read and apply all migrations in order
    migrations_dir = "/home/alirezaabd/Main/Projects/NEXA/mission-control/server/migrations"
    migration_files = sorted(os.listdir(migrations_dir))
    for mf in migration_files:
        if mf.endswith(".sql"):
            with open(os.path.join(migrations_dir, mf), "r") as f:
                sql_content = f.read()
            cur.executescript(sql_content)
    con.commit()
    print("Local SQLite schema initialized with all 16 migrations.")

    # Mappings
    user_map = {} # planka_user_id -> new_user_id
    workspace_id = str(uuid.uuid4())
    project_map = {} # planka_proj_id -> new_proj_id
    board_map = {} # planka_board_id -> new_board_id
    column_map = {} # planka_list_id -> new_column_id
    card_map = {} # planka_card_id -> new_card_id

    # 1. Insert Users
    owner_user_id = None
    for u in users:
        u_id = str(uuid.uuid4())
        user_map[u['id']] = u_id
        if u['username'] == 'alirezaabd' or owner_user_id is None:
            owner_user_id = u_id
        role = 'admin' if u['username'] == 'alirezaabd' else 'member'
        cur.execute(
            """INSERT INTO users (id, email, username, display_name, password_hash, role, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (u_id, u['email'], u['username'], u['name'] or u['username'], ARGON2_HASH_123456, role, now_iso, now_iso)
        )
    print(f"Inserted {len(users)} users into SQLite.")

    # 2. Insert Workspace
    cur.execute(
        """INSERT INTO workspaces (id, name, slug, description, owner_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (workspace_id, "NEXA Workspace", "nexa-workspace", "Primary team workspace for NEXA Mission Control", owner_user_id, now_iso, now_iso)
    )

    for u_id in user_map.values():
        role = 'owner' if u_id == owner_user_id else 'member'
        cur.execute(
            """INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
               VALUES (?, ?, ?, ?, ?)""",
            (str(uuid.uuid4()), workspace_id, u_id, role, now_iso)
        )

    # 3. Insert Projects
    for p in projects:
        new_p_id = str(uuid.uuid4())
        project_map[p['id']] = new_p_id
        cur.execute(
            """INSERT INTO projects (id, workspace_id, name, identifier, description, color, visibility, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 'public', ?, ?)""",
            (new_p_id, workspace_id, p['name'], "NEXA", p.get('description') or "NEXA Project", "#0d9488", now_iso, now_iso)
        )
        for u_id in user_map.values():
            role = 'admin' if u_id == owner_user_id else 'member'
            cur.execute(
                """INSERT INTO project_members (id, project_id, user_id, role, joined_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), new_p_id, u_id, role, now_iso)
            )

    # 4. Insert Boards
    for b in boards:
        new_b_id = str(uuid.uuid4())
        board_map[b['id']] = new_b_id
        target_proj_id = project_map.get(b['project_id'], list(project_map.values())[0])
        cur.execute(
            """INSERT INTO boards (id, project_id, name, created_at)
               VALUES (?, ?, ?, ?)""",
            (new_b_id, target_proj_id, b['name'], now_iso)
        )

    # 5. Insert Columns (Filtering empty/unnamed lists if any, or keeping them with default names)
    col_pos = 1000.0
    for l in lists:
        new_col_id = str(uuid.uuid4())
        column_map[l['id']] = new_col_id
        target_board_id = board_map.get(l['board_id'], list(board_map.values())[0])
        name = l['name'] or f"Column {int(col_pos / 1000)}"
        col_type = 'done' if 'done' in name.lower() else ('backlog' if 'backlog' in name.lower() else 'active')
        cur.execute(
            """INSERT INTO columns (id, board_id, name, type, position, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (new_col_id, target_board_id, name, col_type, col_pos, now_iso)
        )
        col_pos += 1000.0

    # 6. Insert Cards
    card_pos = 1000.0
    for c in cards:
        new_card_id = str(uuid.uuid4())
        card_map[c['id']] = new_card_id
        target_col_id = column_map.get(c['list_id'])
        if not target_col_id:
            target_col_id = list(column_map.values())[0]
        
        target_proj_id = list(project_map.values())[0]
        creator_id = user_map.get(c.get('creator_user_id'), owner_user_id)

        c_created = c.get('created_at') or now_iso
        c_updated = c.get('updated_at') or now_iso

        cur.execute(
            """INSERT INTO cards (id, project_id, column_id, title, description, priority, position, creator_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'no_priority', ?, ?, ?, ?)""",
            (new_card_id, target_proj_id, target_col_id, c['name'], c.get('description') or '', card_pos, creator_id, c_created, c_updated)
        )
        card_pos += 1000.0

    # 7. Insert Card Assignees
    for cm in card_memberships:
        target_card = card_map.get(cm['card_id'])
        target_user = user_map.get(cm['user_id'])
        if target_card and target_user:
            cur.execute(
                """INSERT OR IGNORE INTO card_assignees (card_id, user_id) VALUES (?, ?)""",
                (target_card, target_user)
            )

    # 8. Insert Comments
    for cm in comments:
        target_card = card_map.get(cm['card_id'])
        target_user = user_map.get(cm.get('user_id'), owner_user_id)
        if target_card:
            cur.execute(
                """INSERT INTO comments (id, card_id, author_id, body, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), target_card, target_user, cm['text'], cm.get('created_at') or now_iso)
            )

    con.commit()
    con.close()
    print("SQLite migration database constructed successfully!")

    # Verify counts in SQLite
    con_check = sqlite3.connect(local_db_path)
    cur_check = con_check.cursor()
    for tbl in ['users', 'workspaces', 'projects', 'boards', 'columns', 'cards', 'card_assignees', 'comments']:
        cur_check.execute(f"SELECT count(*) FROM {tbl}")
        print(f"  Verified {tbl} count: {cur_check.fetchone()[0]}")
    con_check.close()

    # Upload migrated database to VPS at /opt/planka/data/mission-control.db
    print("Uploading migrated database to VPS /opt/planka/data/mission-control.db...")
    sftp = ssh.open_sftp()
    sftp.put(local_db_path, "/opt/planka/data/mission-control.db")
    sftp.close()
    print("Database uploaded successfully!")

    ssh.close()
    print("All extraction and data staging finished!")

if __name__ == "__main__":
    main()
