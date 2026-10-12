# NEXA Mission Control

A lightweight project-management application built with Rust/Axum, SQLite WAL, SQLx, React 19, Vite, Tailwind v4, TanStack Query, and Zustand. It does not require PostgreSQL, Redis, or a separate automation worker.

## Run locally

Requirements: a current stable Rust toolchain, Node.js 22+, pnpm, and Python 3 for the combined launcher.

```bash
./scripts/run-local.sh
```

Open **http://localhost:3000**. The API listens on **http://localhost:8000** and exposes `/api/v1/health`. The launcher starts both services, enables a local demo workspace, and generates a random signing key for the session. Stop the launcher with Ctrl+C to stop both services.

Demo sign-in: `commander@nexa.internal` / `Password123!`. Demo provisioning is explicitly opt-in; keep `MISSION_CONTROL_DEMO=0` in production. You can also create your own account from the registration page.

To start the processes separately:

```bash
# Terminal 1
cd server
cargo fetch --locked
# Configure .env from .env.example and set a unique JWT_SECRET first.
cargo run --locked

# Terminal 2, starting from the repository root
cd client
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
```

Existing databases migrate automatically on startup. SQLite databases and uploaded files are stored under `server/data/` and `server/uploads/` by default and are excluded from Git.

## Features

- Kanban with drag-and-drop, fractional ordering, quick filters, swimlanes, sorting, WIP warnings, themes, starred boards, and saved views.
- An editable table with bulk operations, a date-based timeline with dependencies and draggable task bars, and monthly/weekly scheduling calendars.
- Backlog grooming, sprint planning/start/completion, unfinished-work carryover, daily burndown snapshots, velocity history, epics, subtasks, releases, and changelogs.
- Card timers, watchers, attachments, covers, checklists with assignees/dates, custom fields, votes, templates, safe Markdown, mentions, bidirectional relationships, and cross-board references.
- Event-driven rules, scheduled maintenance, card/board macros, and response/resolution SLA deadlines and countdowns. Background work runs inside the Rust process every minute.
- Archive/restore, workspace and project roles, private-project boundaries, internal comments, activity audit trails, notifications, structured search, keyboard shortcuts, and deep links.
- CSV, Excel `.xlsx`, and JSON exports; Trello and Mission Control task imports; personal API tokens; signed GitHub/GitLab commits and inbound email; Slack/Discord alerts; OIDC sign-in; Figma embeds and document/cloud-file references.
- Responsive light/dark interfaces and an installable PWA shell. API responses and uploaded files are never cached by the service worker.

The identity and integration adapters require your provider settings. SAML organizations use an OIDC identity broker; cloud-drive support links to provider-hosted files. See [integration setup](docs/INTEGRATIONS.md) for exact configuration and scope.

## Real-time and expanded workflows

Task changes synchronize through authenticated WebSockets with reconnect/resync support. The workspace command center adds Inbox, Planner, combined calendar/portfolio views and capacity planning. Project settings add work types, workflow gates, approvals, request forms, reusable board templates and member permissions. Settings includes authenticator-based two-factor authentication and opt-in desktop notifications.

See [the feature expansion guide](docs/FEATURE_EXPANSION.md) for controls, setup, limits and backup requirements.

## Search and shortcuts

Use Cmd/Ctrl+K for global search. Filters can be combined, for example:

```text
(priority:high OR priority:urgent) AND NOT status:done
assignee:me AND label:Bug AND points >= 3
```

Open a task and use `m` for assignees, `l` for labels, `d` for its due date, Space to toggle self-assignment, or `c` to archive it. `?` shows the shortcut guide. Shortcuts do not run while typing in a field.

## Verify

```bash
(cd server && cargo test --locked)
(cd client && pnpm test && pnpm build && pnpm lint)
```

Development rules live in `.rules/`. [The execution report](docs/IMPLEMENTATION_STATUS.md) maps this implementation to the original [enterprise plan](ENTERPRISE_ROADMAP_PLAN.md).

## Docker deployment

```bash
cp .env.example .env
# Set JWT_SECRET to a generated secret in .env.
docker compose up -d --build
```

The Compose ports bind to localhost. Put your existing HTTPS reverse proxy in front of the client for public deployment. The client container proxies API and upload traffic to the server container; the API health check is `/api/v1/health`. Demo accounts are not seeded by Compose. Docker builds may need the same registry access as local builds.

Back up the SQLite database with its online backup API (or stop the server before copying the database), plus uploads and server configuration. Do not copy only a live `.db` file while WAL writes are active. Preserve `JWT_SECRET`, the authenticator encryption key (`data/local-mfa.key` or `MFA_ENCRYPTION_KEY`), provider configuration, and identity mappings when restoring. JSON exports contain board data; they do not include provider secrets, password hashes, or attachment file bytes and do not replace a full server backup.

Local service desk, custom roles, task action rules, plugins, multi-process events and recovery: [Local operations guide](docs/LOCAL_OPERATIONS.md).

The date and date-time controls use the same NEXA calendar design as the CRM frontend, with the Gregorian calendar in Mission Control. Existing installations keep their database and browser sessions during the branding upgrade. Rich text editing is deferred.
