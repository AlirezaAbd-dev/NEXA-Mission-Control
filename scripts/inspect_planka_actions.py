import os
import sys
import json
import paramiko

SERVER_IP = "130.185.78.131"
USERNAME = "root"
PASSWORD = "in9o89rvhJcskRjZ"

def main():
    print(f"Connecting to VPS {SERVER_IP}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, username=USERNAME, password=PASSWORD, timeout=15)
    print("SSH connected!")

    # Start planka-db container if not running
    print("Ensuring planka-db container is running...")
    ssh.exec_command("docker start planka-db")
    
    # Query all actions from planka
    wrapped = "SELECT json_agg(t) FROM (SELECT a.id, a.card_id, a.user_id, a.type, a.data, a.created_at, c.name as card_title, u.username as user_username, u.name as user_name FROM action a LEFT JOIN card c ON a.card_id = c.id LEFT JOIN user_account u ON a.user_id = u.id ORDER BY a.created_at ASC) t;"
    cmd = f'docker exec planka-db psql -U postgres -d planka -t -A -c "{wrapped}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    raw = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if err:
        print("STDERR:", err)

    if not raw:
        print("No actions returned or empty output.")
        return

    actions = json.loads(raw)
    print(f"Total actions extracted: {len(actions)}")
    
    types = set(a.get("type") for a in actions)
    print(f"Distinct action types: {types}")
    
    for i, a in enumerate(actions[:10]):
        print(f"[{i+1}] Type: {a.get('type')}, Card: {a.get('card_title')}, User: {a.get('user_username')}, Time: {a.get('created_at')}")
        print(f"     Data: {json.dumps(a.get('data'))}")

    # Also inspect SQLite cards on VPS
    stdin, stdout, stderr = ssh.exec_command('docker exec planka sqlite3 /data/mission-control.db "SELECT count(*) FROM cards; SELECT count(*) FROM activities;"')
    print("SQLite counts (cards, activities):")
    print(stdout.read().decode())

    ssh.close()

if __name__ == "__main__":
    main()
