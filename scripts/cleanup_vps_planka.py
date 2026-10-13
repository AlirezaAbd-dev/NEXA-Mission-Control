import paramiko
import time

SERVER_IP = "130.185.78.131"
USERNAME = "root"
PASSWORD = "in9o89rvhJcskRjZ"

def main():
    print(f"Connecting to VPS {SERVER_IP}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, username=USERNAME, password=PASSWORD, timeout=15)
    print("Connected successfully!\n")

    def run(cmd):
        print(f"--> [EXEC]: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out:
            print("    [OUT]", out)
        if err:
            print("    [ERR]", err)
        print(f"    [EXIT CODE]: {exit_status}\n")
        return exit_status, out

    # 1. Back up old Planka db-data to /root/ just in case before removing
    print("Step 1: Archiving old planka db-data for safety...")
    run("tar -czf /root/old-planka-db-data-backup.tar.gz -C /opt/planka db-data")
    run("ls -lh /root/old-planka-db-data-backup.tar.gz")

    # 2. Delete old planka postgres data and old migration scripts
    print("Step 2: Removing old Planka db-data and legacy migration scripts...")
    run("rm -rf /opt/planka/db-data")
    run("rm -f /opt/planka/migrate-vikunja-to-planka.js /opt/planka/set-password.js")

    # 3. Remove old Planka and unused legacy docker images
    print("Step 3: Removing old Planka image and unused legacy images...")
    run("docker rmi ghcr.io/plankanban/planka:latest")
    run("docker rmi postgres:16-alpine || true")
    run("docker rmi vikunja/vikunja:latest || true")
    run("docker image prune -f")

    # 4. Migrate directory /opt/planka to /opt/mission-control (if not already done)
    print("Step 4: Renaming /opt/planka to /opt/mission-control with symlink...")
    run("if [ ! -d /opt/mission-control ]; then mv /opt/planka /opt/mission-control && ln -s /opt/mission-control /opt/planka; fi")
    run("ls -la /opt/mission-control")

    # 5. Update docker-compose.yml to use mission-control service/container name
    print("Step 5: Updating docker-compose.yml in /opt/mission-control...")
    compose_content = """services:
  mission-control:
    image: alirezaabddev/nexa-mission-control:latest
    container_name: mission-control
    restart: unless-stopped
    volumes:
      - /opt/mission-control/data:/data
      - /opt/mission-control/uploads:/uploads
    environment:
      - PORT=1337
      - HOST=0.0.0.0
      - DATABASE_URL=sqlite:///data/mission-control.db?mode=rwc
      - JWT_SECRET=78260ff5a75f516d4066d5447d3b2e7f64d97db9822e5ce205b1f92b8172ad54
      - UPLOAD_DIR=/uploads
      - STATIC_DIR=/app/dist
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:1337/api/v1/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - deploy_crm

networks:
  deploy_crm:
    external: true
"""
    sftp = ssh.open_sftp()
    with sftp.open("/opt/mission-control/docker-compose.yml", "w") as f:
        f.write(compose_content)
    sftp.close()

    # 6. Update Nginx to point tasks.nexasmart.net to mission-control:1337
    print("Step 6: Updating Nginx configuration...")
    run("sed -i 's|http://planka:1337|http://mission-control:1337|g' /opt/nexa/deploy/nginx/default.conf")
    run("grep -n 'mission-control:1337' /opt/nexa/deploy/nginx/default.conf")

    # 7. Stop old planka container, start new mission-control container
    print("Step 7: Launching mission-control container...")
    run("docker stop planka && docker rm planka || true")
    run("cd /opt/mission-control && docker compose up -d")

    # 8. Reload Nginx
    print("Step 8: Reloading Nginx...")
    time.sleep(3)
    run("docker exec deploy-nginx-1 nginx -t")
    run("docker exec deploy-nginx-1 nginx -s reload")

    # 9. Verify health
    print("Step 9: Verifying deployment health...")
    time.sleep(3)
    run("docker ps --filter name=mission-control")
    run("curl -sf http://localhost:1337/api/v1/health || curl -sf https://tasks.nexasmart.net/api/v1/health")

    ssh.close()
    print("Clean up and migration completed successfully!")

if __name__ == "__main__":
    main()
