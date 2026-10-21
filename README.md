<div align="center">

# ⚡ NEXA Mission Control

### The Ultra-Fast, Self-Hosted Project Management Platform Built in Rust & React

[![Docker Pulls](https://img.shields.io/docker/pulls/alirezaabddev/nexa-mission-control?style=for-the-badge&logo=docker&logoColor=white&color=0d9488)](https://hub.docker.com/r/alirezaabddev/nexa-mission-control)
[![Docker Image Size](https://img.shields.io/docker/image-size/alirezaabddev/nexa-mission-control/latest?style=for-the-badge&logo=docker&logoColor=white&color=0f766e)](https://hub.docker.com/r/alirezaabddev/nexa-mission-control)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg?style=for-the-badge)](LICENSE)
[![Built with Rust](https://img.shields.io/badge/Backend-Rust%20%2B%20Axum-orange.svg?style=for-the-badge&logo=rust)](https://www.rust-lang.org/)
[![Built with React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-blue.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Mobile%20Ready-purple.svg?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

<p align="center">
  <b>A modern, blazingly fast, full-featured alternative to Jira, Trello, and Linear.</b><br>
  Single 42MB Docker image • Instant startup • Zero external database requirements • Runs on only ~30MB of RAM.
</p>

[Design Showcase](#design-showcase) • [Quick Start](#-instant-docker-run) • [Key Features](#-features-at-a-glance) • [Docs](docs/INTEGRATIONS.md)

---

</div>

## Design showcase

A clearer view of work, in NEXA's petrol and teal palette.

[![NEXA Mission Control designer showcase: floating Kanban, calendar, and task panels on a dark petrol background with teal studio lighting](docs/showcase/mission-control-hero.png)](docs/showcase/mission-control-hero.png)

**Every detail. One shared mission.** From the big picture on the board to the context inside a task.

[![Editorial Mission Control design presentation on a pale mint background, highlighting task details, checklist progress, and teammate labels](docs/showcase/mission-control-details.png)](docs/showcase/mission-control-details.png)

*Designer presentation artwork composed with AI from actual application screenshots and fictional sample data. Perspective, lighting, and detail callouts are added for presentation. Select an image to view it at full size.*

<details>
<summary>View the original application screenshots</summary>

- [Kanban board](docs/screenshots/kanban-board.jpg)
- [Task details](docs/screenshots/task-details.jpg)
- [Weekly calendar](docs/screenshots/calendar-planning.jpg)

</details>

---

## 💡 Why NEXA Mission Control?

Most modern task management tools are resource-hungry enterprise behemoths requiring Postgres, Redis, Elasticsearch, background workers, and heavy Node.js runtimes that consume gigabytes of memory on your VPS.

**NEXA Mission Control flips the script:**
- 🦀 **Pure Rust Backend**: Engineered with Axum and SQLite WAL for sub-millisecond query responses and rock-solid memory safety.
- ⚡ **Lightweight Footprint**: Consumes only **~25-35MB of RAM** at idle. Perfect for small VPS instances or home servers.
- 📦 **Single-Image Container**: Ships frontend, API server, background automation, and database engine into a **single 42MB Docker image**.
- 📱 **Mobile PWA & Touch First**: Install directly to your iOS or Android home screen with adaptive icons and native-feeling touch drag-and-drop.
- 🔒 **Self-Hosted & Private**: Complete data ownership with local encrypted backups, audit trails, and strict workspace boundaries.

---

## 🚀 Instant Docker Run

Deploy NEXA Mission Control in under 10 seconds with a single command:

```bash
docker run -d \
  --name mission-control \
  -p 1337:1337 \
  -v nexa_data:/data \
  -v nexa_uploads:/uploads \
  -e JWT_SECRET="choose-a-strong-secret-key-at-least-32-chars-long" \
  --restart unless-stopped \
  alirezaabddev/nexa-mission-control:latest
```

Open **`http://localhost:1337`** (or your server's IP) and direct your missions immediately!

### 🐳 Docker Compose

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
    volumes:
      - nexa_data:/data
      - nexa_uploads:/uploads
    restart: unless-stopped

volumes:
  nexa_data:
  nexa_uploads:
```

---

## 🎯 Features at a Glance

### 📋 Versatile Project Views
- **Fluid Kanban Board**: Fractional reordering, custom swimlanes (grouped by Priority, Assignee, Epic), WIP limits, themes, and starred boards.
- **Data Grid / Spreadsheet**: High-speed spreadsheet-style task table with multi-select and bulk actions.
- **Interactive Timeline (Gantt)**: Visual task scheduling with dependencies, drag-and-drop bar resizing, and milestones.
- **Calendar View**: Monthly and weekly scheduling calendars synced directly with task deadlines.
- **Agile Backlog Grooming**: Dedicated sprint planning, backlog prioritization, sprint activation, and automated carryover.

### 🃏 Rich Card & Task Intelligence
- **Tiptap Rich-Text Editor**: Multi-level headings (H1/H2/H3), task checklists, syntax-highlighted code blocks, tables, images, and smart embeds.
- **Subtasks & Parent Breakdown**: Break down complex issues into linked subtasks with instant unlink and progress bars.
- **Custom Attributes & Fields**: Text, numbers, dropdowns, dates, and checkboxes tailored to your team's workflow.
- **Card Timers & Time Tracking**: Built-in stopwatch timers and manual work log sheets.
- **Collaboration**: Mentions, watchers, upvoting, file attachments with image preview, and bidirectional task dependencies.
- **Archive & Restore**: Safe soft-deletion with instant search, preview, and one-click board restoration.

### ⚡ Enterprise Power, Built Locally
- **Zero-Latency In-Process Automation**: Trigger rules, scheduled actions, and SLA countdowns executed natively inside the Rust binary every minute without Redis or Celery.
- **Granular Permissions & Privacy**: Fine-grained project privacy (Public/Private), custom workspace roles, and confidential internal comments.
- **Universal Command Palette (`Ctrl+K` / `⌘K`)**: Rapid global search with structured operators:
  ```text
  (priority:high OR priority:urgent) AND NOT status:done
  assignee:me AND label:Bug AND points >= 3
  ```
- **Blazing Fast Keyboard Navigation**: Press `?` anywhere to reveal single-key shortcuts (`m` for members, `l` for labels, `d` for dates, `Space` to self-assign).
- **Two-Factor Authentication (2FA/TOTP)**: Secure your workspace with standard authenticator apps and recovery codes.
- **Full Data Portability**: Instant one-click import from Trello and exports to CSV, Excel (`.xlsx`), and JSON.

---

## 🛠️ Local Development

### Prerequisites
- [Rust Toolchain](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) (v22+) & [pnpm](https://pnpm.io/)
- Python 3

### One-Command Dev Launcher
```bash
git clone https://github.com/AlirezaAbd-dev/NEXA-Mission-Control.git
cd NEXA-Mission-Control

./scripts/run-local.sh
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Demo Credentials**: `commander@nexa.internal` / `Password123!` (or register your own user).

### Running Automated Test Suite
```bash
# Rust backend unit & integration tests
(cd server && cargo test --locked)

# Frontend TypeScript validation & unit tests
(cd client && pnpm test && pnpm build && pnpm lint)
```

After pulling dependency changes, restore the frontend packages from the committed lockfile before starting Vite or running checks:

```bash
(cd client && pnpm install --frozen-lockfile)
```

The rich-text editor's Tiptap packages are already declared in `client/package.json` and `client/pnpm-lock.yaml`. A missing `@tiptap/*` module error after pulling means the local installation needs to be refreshed; no API key or separate editor service is required.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are warmly welcomed! Feel free to check the [issues page](https://github.com/AlirezaAbd-dev/NEXA-Mission-Control/issues) or submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/AlirezaAbd-dev">Alireza Abd</a> and the NEXA Team.</sub>
</div>
