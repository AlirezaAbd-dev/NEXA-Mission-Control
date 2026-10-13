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

# Mission Control drop-in replacement Compose
# Replaces Planka directly on container_name: planka on network deploy_crm at port 1337.
MISSION_CONTROL_COMPOSE = f"""services:
  planka:
    image: alirezaabddev/nexa-mission-control:latest
    container_name: planka
    restart: unless-stopped
    volumes:
      - /opt/planka/data:/data
      - /opt/planka/uploads:/uploads
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

    # 1. Update /opt/planka directory structure for Mission Control
    print("Preparing /opt/planka for Mission Control...")
    ssh.exec_command("mkdir -p /opt/planka/data /opt/planka/uploads")

    # 2. Stop old planka service if running
    print("Stopping previous planka container...")
    stdin, stdout, stderr = ssh.exec_command("cd /opt/planka && docker compose down")
    stdout.channel.recv_exit_status()

    # 3. Write new compose file
    print("Uploading Mission Control docker-compose.yml to /opt/planka/...")
    with sftp.open("/opt/planka/docker-compose.yml", "w") as f:
        f.write(MISSION_CONTROL_COMPOSE)

    # 4. Pull and Start Mission Control
    print("Pulling and starting Mission Control...")
    stdin, stdout, stderr = ssh.exec_command("cd /opt/planka && docker compose pull && docker compose up -d")
    print(stdout.read().decode())
    print(stderr.read().decode())

    time.sleep(3)
    stdin, stdout, stderr = ssh.exec_command("docker ps --filter name=planka")
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
