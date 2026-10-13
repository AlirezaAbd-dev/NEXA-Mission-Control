# ⚡ NEXA Mission Control

### The Ultra-Fast, Self-Hosted Project Management Platform Built in Rust & React

[![Docker Pulls](https://img.shields.io/docker/pulls/alirezaabddev/nexa-mission-control?style=for-the-badge&logo=docker&logoColor=white&color=0d9488)](https://hub.docker.com/r/alirezaabddev/nexa-mission-control)
[![Docker Image Size](https://img.shields.io/docker/image-size/alirezaabddev/nexa-mission-control/latest?style=for-the-badge&logo=docker&logoColor=white&color=0f766e)](https://hub.docker.com/r/alirezaabddev/nexa-mission-control)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg?style=for-the-badge)](https://github.com/AlirezaAbd-dev/NEXA-Mission-Control/blob/main/LICENSE)
[![Built with Rust](https://img.shields.io/badge/Backend-Rust%20%2B%20Axum-orange.svg?style=for-the-badge&logo=rust)](https://www.rust-lang.org/)
[![Built with React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-blue.svg?style=for-the-badge&logo=react)](https://react.dev/)

---

## 💡 What is NEXA Mission Control?

**NEXA Mission Control** is a lightweight, blazingly fast, and fully self-hosted alternative to Jira, Trello, and Linear.

Most task management platforms demand heavy infrastructure: separate PostgreSQL servers, Redis caches, Elasticsearch, Node.js or JVM runtimes, and gigabytes of memory.

**NEXA Mission Control delivers the complete experience in a single, self-contained container:**
- 🦀 **Pure Rust Engine**: Built with Axum for sub-millisecond API responses and rock-solid memory safety.
- ⚡ **Tiny Resource Footprint**: Consumes only **~25-35MB of RAM** at idle. Ideal for low-cost VPS instances, Raspberry Pis, or enterprise servers.
- 📦 **Single 42MB Docker Image**: Bundles the compiled Rust backend, embedded SQLite with WAL mode, background automation engine, and the optimized React 19 SPA into one lightweight image.
- 🚀 **Zero External Dependencies**: No PostgreSQL, MySQL, or Redis required. Just run the container and start managing projects.
- 📱 **Mobile PWA Ready**: Fully responsive with touch drag-and-drop, installable to iOS and Android home screens.

---

## 🚀 Quick Start

### 1. Run with Docker CLI

Launch NEXA Mission Control in seconds:

```bash
docker run -d \
  --name mission-control \
  -p 1337:1337 \
  -v nexa_data:/data \
  -v nexa_uploads:/uploads \
  -e JWT_SECRET="generate-a-random-32-char-secret-string-here" \
  --restart unless-stopped \
  alirezaabddev/nexa-mission-control:latest
```

Open **`http://localhost:1337`** in your browser to access the application!

---

### 2. Run with Docker Compose (Recommended)

Save the following as `docker-compose.yml`:

```yaml
version: "3.8"

services:
  mission-control:
    image: alirezaabddev/nexa-mission-control:latest
    container_name: nexa-mission-control
    ports:
      - "1337:1337"
    environment:
      - HOST=0.0.0.0
      - PORT=1337
      - JWT_SECRET=change-me-to-a-super-secure-random-token-key-32chars
      - DATABASE_URL=sqlite:///data/taskflow.db?mode=rwc
      - UPLOAD_DIR=/uploads
      - CLIENT_DIR=/app/dist
      - RUST_LOG=info
    volumes:
      - nexa_data:/data
      - nexa_uploads:/uploads
    restart: unless-stopped

volumes:
  nexa_data:
  nexa_uploads:
```

Start the service:

```bash
docker compose up -d
```

---

## 🎯 Key Features

### 📋 Multiple Project Views
- **Fluid Kanban Board**: Column WIP limits, custom swimlanes (grouped by Priority, Assignee, or Epic), custom card themes, and fractional drag-and-drop reordering.
- **Data Grid / Spreadsheet View**: High-speed table view for batch editing, sorting, and multi-field management.
- **Interactive Timeline (Gantt Chart)**: Visual schedule tracking with dependencies, milestone markers, and draggable durations.
- **Calendar View**: Deadline and schedule mapping across monthly and weekly layouts.
- **Agile Backlog Grooming**: Sprint planning, backlog prioritization, sprint activation, and automated backlog carryovers.

### 🃏 Smart Task Intelligence
- **Rich-Text Editor (Tiptap)**: Headings, task checklists, syntax-highlighted code blocks, tables, inline images, and embeds.
- **Subtasks & Parent Hierarchies**: Break complex user stories into subtasks with instant progress tracking.
- **Custom Attributes & Fields**: Tailor tasks with custom text, numeric, date, select, and checkbox properties.
- **Time Tracking**: Built-in task stopwatch timers and manual work duration logging.
- **Collaboration**: Mentions, watchers, upvoting, file attachments with image preview, and bidirectional task blockers/dependencies.
- **Archive & Restore**: Soft-deletion with instant search, preview, and one-click board restoration.

### ⚡ Enterprise Power, Built Locally
- **Zero-Latency In-Process Automation**: Trigger rules, scheduled actions, and SLA countdowns run directly inside the Rust binary every minute without Redis or Celery.
- **Two-Factor Authentication (2FA/TOTP)**: Secure accounts with standard authenticator apps and emergency recovery codes.
- **Universal Command Palette (`Ctrl+K` / `⌘K`)**: Rapid global search with structured operators:
  ```text
  (priority:high OR priority:urgent) AND NOT status:done
  assignee:me AND label:Bug AND points >= 3
  ```
- **Keyboard Shortcuts**: Press `?` anywhere to reveal single-key shortcuts (`m` for members, `l` for labels, `d` for dates, `Space` to self-assign).
- **Full Data Portability**: 1-click import from Trello; export tasks and projects to CSV, Excel (`.xlsx`), and JSON.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `1337` | Internal port the server listens on |
| `HOST` | `0.0.0.0` | Bind address for incoming connections |
| `JWT_SECRET` | *(Required)* | Secret key used for signing JWT tokens (min 32 characters) |
| `DATABASE_URL` | `sqlite:///data/taskflow.db?mode=rwc` | SQLite database path with WAL mode enabled |
| `UPLOAD_DIR` | `/uploads` | Directory for card attachments and user uploads |
| `CLIENT_DIR` | `/app/dist` | Directory containing compiled frontend assets |
| `RUST_LOG` | `info` | Logging verbosity (`error`, `warn`, `info`, `debug`, `trace`) |

---

## 💾 Persistent Volumes

| Container Path | Purpose |
|---|---|
| `/data` | Stores SQLite database file (`taskflow.db`) and WAL journals |
| `/uploads` | Stores task attachments, images, and user avatars |

Make sure both directories are backed up regularly or mapped to persistent Docker volumes.

---

## 🌐 Reverse Proxy Configuration

NEXA Mission Control runs on port `1337` and works seamlessly behind modern reverse proxies with WebSocket / Server-Sent Events (SSE) support.

### Nginx Example

```nginx
server {
    listen 80;
    server_name tasks.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tasks.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/tasks.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tasks.yourdomain.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:1337;
        proxy_http_version 1.1;

        # WebSocket & Server-Sent Events (Realtime Sync)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for realtime SSE streams
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
```

### Caddy Example

```caddy
tasks.yourdomain.com {
    reverse_proxy 127.0.0.1:1337
}
```

---

## 🔄 Upgrading to the Latest Version

With persistent volumes mounted, upgrades are seamless and preserve all data:

```bash
# Pull the latest image
docker compose pull

# Recreate the container
docker compose up -d
```

Database migrations run automatically and safely on startup.

---

## 📦 Backup & Restore

### Backup
Since NEXA Mission Control uses SQLite with WAL mode, you can safely copy the database while running:

```bash
docker exec nexa-mission-control sqlite3 /data/taskflow.db ".backup /data/backup.db"
docker cp nexa-mission-control:/data/backup.db ./backup-$(date +%Y%m%d).db
```

To backup attachments:
```bash
docker cp nexa-mission-control:/uploads ./uploads-backup-$(date +%Y%m%d)
```

---

## 📄 License & Links

- **GitHub Repository**: [https://github.com/AlirezaAbd-dev/NEXA-Mission-Control](https://github.com/AlirezaAbd-dev/NEXA-Mission-Control)
- **Issues & Support**: [GitHub Issues](https://github.com/AlirezaAbd-dev/NEXA-Mission-Control/issues)
- **License**: MIT License
