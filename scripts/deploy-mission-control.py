import os
import sys
import time
import secrets
import paramiko

SERVER_IP = "130.185.78.131"
USERNAME = "root"
PASSWORD = "in9o89rvhJcskRjZ"

LOCAL_CONF = "/home/alirezaabd/Main/Projects/NEXA/deploy/nginx/default.conf"
REMOTE_CONF = "/opt/nexa/deploy/nginx/default.conf"

JWT_SECRET = secrets.token_hex(32)

# Mission Control Production Compose
MISSION_CONTROL_COMPOSE = f"""services:
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
      - JWT_SECRET={JWT_SECRET}
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

def main():
    print(f"Connecting to {SERVER_IP}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, username=USERNAME, password=PASSWORD, timeout=10)
    print("Connected!")

    sftp = ssh.open_sftp()

    # 1. Update /opt/mission-control directory structure
    print("Preparing /opt/mission-control...")
    ssh.exec_command("mkdir -p /opt/mission-control/data /opt/mission-control/uploads")

    # 2. Write compose file
    print("Uploading Mission Control docker-compose.yml to /opt/mission-control/...")
    with sftp.open("/opt/mission-control/docker-compose.yml", "w") as f:
        f.write(MISSION_CONTROL_COMPOSE)

    # 3. Pull and Start Mission Control
    print("Pulling and starting Mission Control...")
    stdin, stdout, stderr = ssh.exec_command("cd /opt/mission-control && docker compose pull && docker compose up -d")
    print(stdout.read().decode())
    print(stderr.read().decode())

    time.sleep(3)
    stdin, stdout, stderr = ssh.exec_command("docker ps --filter name=mission-control")
    print(stdout.read().decode())

    # 5. Reload Nginx
    print("Reloading Nginx to route https://tasks.nexasmart.net to Mission Control...")
    stdin, stdout, stderr = ssh.exec_command("docker exec deploy-nginx-1 nginx -s reload")
    print(stdout.read().decode())
    print(stderr.read().decode())

    sftp.close()
    ssh.close()
    print("Deployment completed successfully!")

if __name__ == "__main__":
    main()
