# NEXA Mission Control: Enterprise Feature Roadmap & Master Execution Guide

> **Project**: NEXA Mission Control (Enterprise Project Management Platform)  
> **Repository**: [GitHub: AlirezaAbd-dev/NEXA-Mission-Control](https://github.com/AlirezaAbd-dev/NEXA-Mission-Control)  
> **Status**: **Phases 1–5 implemented locally; provider configuration required for integrations**
> **Stack**: Rust (Axum 0.8 + SQLite WAL + SQLx) + React 19 (TypeScript + Vite + Tailwind CSS v4 + TanStack Query + Zustand)

---

Implementation scope and validation are recorded in [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md). The detailed sections below preserve the original requirements.

## Table of Contents
1. [Developer Onboarding & Quick Start (Work Computer Setup)](#1-developer-onboarding--quick-start-work-computer-setup)
2. [Architectural Principles & Design System Rules](#2-architectural-principles--design-system-rules)
3. [Master Feature Catalog (65 Enterprise Features)](#3-master-feature-catalog-65-enterprise-features)
4. [Phase 1: Card Core Productivity (COMPLETED & VERIFIED)](#4-phase-1-card-core-productivity-completed--verified-)
5. [Phase 2: Multi-View Powerhouse & Board Ergonomics (NEXT TARGET)](#5-phase-2-multi-view-powerhouse--board-ergonomics-next-target-)
6. [Phase 3: Scrum & Agile Lifecycle Engine](#6-phase-3-scrum--agile-lifecycle-engine)
7. [Phase 4: Workflow Automation & Power Rules (Butler)](#7-phase-4-workflow-automation--power-rules-butler)
8. [Phase 5: Enterprise Governance, Integrations & Power-User Tools](#8-phase-5-enterprise-governance-integrations--power-user-tools)

---

## 1. Developer Onboarding & Quick Start (Work Computer Setup)

Follow these exact steps when pulling the project onto your work machine:

### Prerequisites
- **Git**
- **Rust & Cargo** (1.80+ or latest stable)
- **Node.js** (v20+ or v22+) & **pnpm** (`npm install -g pnpm`)
- **SQLite3**

### Step-by-Step Setup
```bash
# 1. Clone or pull the repository
git clone git@github.com:AlirezaAbd-dev/NEXA-Mission-Control.git
cd NEXA-Mission-Control

# 2. Start the Rust Backend
cd server
cargo check       # Verify Rust toolchain and dependencies
cargo run         # Starts Axum server on http://localhost:8000

# 3. In a second terminal, start the React 19 Frontend
cd ../client
pnpm install      # Install dependencies
pnpm run dev      # Starts Vite dev server on http://localhost:5173
```

### Default Credentials
- **Email**: `commander@nexa.internal`
- **Password**: `Password123!`
- **Workspace**: `NEXA Commander's Workspace`
- **Default Project**: `Welcome Project` (`TASK`)

---

## 2. Architectural Principles & Design System Rules

To maintain high code quality and consistency across all remaining phases, adhere strictly to these principles:

1. **Cyber Teal & Petrol Dark Theme**:
   - Primary accents: Cyber Teal (`#0d9488`, `#2dd4bf`).
   - Surfaces: Pure Petrol Dark (`#070e10`, `#0d1a1d`, `#132428`).
   - Border accents: Petroleum Border (`#183035`).
   - Dark mode CSS selector: `@custom-variant dark (&:where(.dark, .dark *));`.
2. **Dialogs & Modals**:
   - **NEVER** use browser-native `alert()`, `confirm()`, or `prompt()`.
   - Always use [`ConfirmModal`](client/src/components/common/ConfirmModal.tsx) or custom modals built on [`Modal`](client/src/components/ui/Modal.tsx).
3. **Form Elements**:
   - **NEVER** use generic HTML `<select>`. Always use [`CustomSelect`](client/src/components/ui/CustomSelect.tsx) or [`Select`](client/src/components/ui/Select.tsx).
   - Use clean rounded geometry (`rounded-lg`, `rounded-xl`, avoid excessive `rounded-3xl` or `rounded-full` on inputs and buttons).
4. **Backend (Rust / Axum 0.8)**:
   - Use `{id}` instead of `:id` in route paths (Axum 0.8 requirement).
   - SQLite tables use UUIDv7 strings for `id` and ISO 8601 RFC3339 strings for timestamps.
   - All mutations should log audit entries in `activities` where relevant.
5. **Frontend (React 19 / TanStack Query)**:
   - Cache keys defined in [`client/src/constants/queryKeys.ts`](client/src/constants/queryKeys.ts).
   - Keep TypeScript types strictly typed in [`client/src/types/index.ts`](client/src/types/index.ts).
   - Verify builds before every commit with `pnpm build` (ensuring 0 errors).

---

## 3. Master Feature Catalog (65 Enterprise Features)

| # | Feature Name | Category | Status | Primary Component / Module |
|---|--------------|----------|--------|----------------------------|
| 1 | Time Tracking & Live Stopwatch | Card Core | **Completed ✅** | `CardTimer.tsx`, `active_timers` |
| 2 | Card Subscriptions / Watchers | Card Core | **Completed ✅** | `CardWatchers.tsx`, `card_watchers` |
| 3 | Attachments & Previews | Card Core | **Completed ✅** | `CardAttachments.tsx`, `server/uploads` |
| 4 | Rich Card Covers & Colors | Card Core | **Completed ✅** | `CardHeader.tsx`, hex/image covers |
| 5 | Multiple Checklists with Progress | Card Core | **Completed ✅** | `CardChecklists.tsx`, `checklists` |
| 6 | Checklist Item Due Dates & Assignees | Card Core | **Phase 1+** | `checklist_items` extended fields |
| 7 | Due Date Status Engine (Overdue/Due Soon) | Card Core | **Completed ✅** | `DueDateBadge.tsx` |
| 8 | Start Date & Range Scheduling | Card Core | **Completed ✅** | `CardSidebar.tsx`, `start_date` |
| 9 | Custom Fields System (6 Data Types) | Card Core | **Completed ✅** | `CardCustomFields.tsx`, `custom_fields` |
| 10 | Card Voting & Kudos | Card Core | **Completed ✅** | `CardVoteButton.tsx`, `card_votes` |
| 11 | Card Mirroring / Cross-Board Links | Card Core | **Phase 1+** | `card_links` cross-board flag |
| 12 | Card Relationships (Blocks/Blocked By) | Card Core | **Completed ✅** | `CardDependencies.tsx`, `card_links` |
| 13 | Subtasks / Issue Hierarchy | Card Core | **Phase 3** | Sub-issue parent link |
| 14 | Card Aging & Stale Visuals | Card Core | **Phase 2** | Card opacity/stale badge by `updated_at` |
| 15 | Card Templates System | Card Core | **Completed ✅** | `is_template`, `BoardColumn.tsx` templates |
| 16 | Interactive Kanban Board | Views | **Completed ✅** | `KanbanBoard.tsx`, `@dnd-kit` |
| 17 | High-Density Spreadsheet / Table View | Views | **Phase 2 🎯** | `BoardTableView.tsx` |
| 18 | Timeline / Interactive Gantt Chart | Views | **Phase 2 🎯** | `BoardGanttView.tsx` |
| 19 | Calendar View (Month/Week) | Views | **Phase 2 🎯** | `BoardCalendarView.tsx` |
| 20 | Dashboard & Analytics Widgets | Views | **Phase 2/3** | `DashboardPage.tsx` |
| 21 | Swimlanes & Board Grouping | Views | **Phase 2 🎯** | Group by Assignee/Epic/Priority |
| 22 | WIP (Work In Progress) Column Limits | Views | **Phase 2 🎯** | `wip_limit` thresholds & alerts |
| 23 | Column Card Sorting | Views | **Phase 2 🎯** | Sort by Due Date, Priority, Title, Date |
| 24 | Quick Filters Bar | Views | **Completed ✅** | `BoardFilters.tsx` |
| 25 | Board Background Themes | Views | **Phase 2** | Board gradient & visual accents |
| 26 | Product Backlog Drawer & Grooming | Agile / Scrum | **Phase 3** | `BacklogPage.tsx` |
| 27 | Sprint Lifecycle (Create/Start/Complete) | Agile / Scrum | **Phase 3** | `SprintRunner.tsx`, `sprints` |
| 28 | Story Points & Fibonacci Estimation | Agile / Scrum | **Completed ✅** | `story_points`, `CardSidebar.tsx` |
| 29 | Burndown Charts | Agile / Scrum | **Phase 3** | `BurndownChart.tsx` |
| 30 | Sprint Velocity Metrics | Agile / Scrum | **Phase 3** | `VelocityChart.tsx` |
| 31 | Epics & Major Initiatives | Agile / Scrum | **Phase 3** | `epics` table & progress meters |
| 32 | Release & Version Management | Agile / Scrum | **Phase 3** | `releases` & changelog generator |
| 33 | Rich Markdown with Mentions | Collaboration | **Completed ✅** | Markdown parser & `@mention` parser |
| 34 | Emoji Comment Reactions | Collaboration | **Completed ✅** | `CommentReaction` |
| 35 | Internal / Restricted Comments | Collaboration | **Phase 4** | `is_internal` comment flag |
| 36 | Granular Notification Center | Collaboration | **Completed ✅** | `NotificationBell.tsx`, `notifications` |
| 37 | Audit Trail & Activity Stream | Collaboration | **Completed ✅** | `CardActivityStream.tsx`, `activities` |
| 38 | Deep Linking (`?card={id}`) | Collaboration | **Completed ✅** | `useUiStore` active card routing |
| 39 | Email-to-Board Gateway | Collaboration | **Phase 5** | SMTP/Webhook ingest |
| 40 | Trigger-Action Rule Builder (Butler) | Automation | **Phase 4** | `automation_rules` engine |
| 41 | Scheduled Maintenance Routines | Automation | **Phase 4** | Tokio background cron |
| 42 | Custom Card Macro Buttons | Automation | **Phase 4** | Quick-run button macros |
| 43 | Custom Board Toolbar Buttons | Automation | **Phase 4** | Board-level automated actions |
| 44 | Automated SLA Timers | Automation | **Phase 4** | Response & resolution countdowns |
| 45 | Global Command Palette (Cmd+K) | Navigation | **Completed ✅** | `CommandPalette.tsx` |
| 46 | Advanced Search & Query Engine | Navigation | **Phase 5** | Structured query filtering |
| 47 | Saved Views & Starred Boards | Navigation | **Phase 2** | User view preferences persistence |
| 48 | Color-Coded Multi-Labels | Navigation | **Completed ✅** | `labels` management & badges |
| 49 | Bulk Operations (Edit / Move) | Navigation | **Phase 2** | Multi-select card actions |
| 50 | Archive & Soft-Delete Restore | Governance | **Phase 5** | `archived_at` trash restore center |
| 51 | Role-Based Access Control (RBAC) | Governance | **Completed ✅** | Owner, Admin, Member, Viewer |
| 52 | Multi-Tenant Workspaces | Governance | **Completed ✅** | Isolated workspace boundaries |
| 53 | SSO & SAML/OIDC Protocol | Governance | **Phase 5** | Enterprise auth provider hooks |
| 54 | Security Audit Compliance Log | Governance | **Phase 5** | Organization-wide event logs |
| 55 | Data Export (CSV, JSON, Excel) | Governance | **Phase 5** | Board & task data exporters |
| 56 | White-Labeling & Branding | Governance | **Completed ✅** | NEXA brand engine |
| 57 | Personal API Tokens | Governance | **Phase 5** | User API key generation |
| 58 | GitHub / GitLab Smart Commits | Integrations | **Phase 5** | Commit hash auto-linking |
| 59 | Slack & Discord Alerts | Integrations | **Phase 5** | Incoming webhook dispatcher |
| 60 | Figma Design Embeds | Integrations | **Phase 5** | Live Figma iframe viewer |
| 61 | Cloud Storage Connectors | Integrations | **Phase 5** | Cloud drive links |
| 62 | Document & Specs Linking | Integrations | **Phase 5** | Architecture docs connector |
| 63 | Responsive Touch PWA | Platform | **Completed ✅** | Mobile-friendly grid & gestures |
| 64 | Dark & Light Zero-Flash Theme | Platform | **Completed ✅** | Tailwind v4 custom dark variant |
| 65 | Keyboard Shortcuts Suite | Platform | **Phase 5** | `c`, `m`, `l`, `d`, `space`, `?` |

---

## 4. Phase 1: Card Core Productivity (COMPLETED & VERIFIED ✅)

### What Was Built & Verified:
1. **Live Stopwatch Time Tracking (`CardTimer.tsx`)**:
   - SQLite table: `active_timers (id, card_id, user_id, started_at, description)`.
   - Axum endpoints:
     - `POST /api/v1/time-logs/timer/start`
     - `POST /api/v1/time-logs/timer/stop`
     - `GET /api/v1/time-logs/timer/active`
   - UI: Real-time ticking stopwatch with live seconds, start/stop button, manual logging form, and past session history.
2. **Card Subscriptions & Watchers (`CardWatchers.tsx`)**:
   - SQLite table: `card_watchers (card_id, user_id, created_at)`.
   - Axum endpoints:
     - `POST /api/v1/cards/{id}/watch` (toggles watch and returns updated card)
     - `GET /api/v1/cards/{id}/watch` (returns subscriber list)
   - UI: Watch toggle with eye icon on `CardHeader`, watcher count badge, and subscriber avatar popover.
3. **Card Links & Dependencies (`CardDependencies.tsx`)**:
   - SQLite table: `card_links (id, source_card_id, target_card_id, link_type, created_at)`.
   - Axum endpoints:
     - `GET /api/v1/cards/{id}/links`
     - `POST /api/v1/cards/{id}/links`
     - `DELETE /api/v1/cards/{id}/links/{link_id}`
   - UI: Relationship badges (**Blocks**, **Blocked by**, **Relates to**), link creation modal, and instant cross-task navigation.
4. **Card Templates & Story Points**:
   - SQLite columns: `is_template INTEGER NOT NULL DEFAULT 0`, `story_points REAL`.
   - UI: Story points estimation input in `CardSidebar`, `#pts` badge on `CardItem`, template toggle switch in sidebar, and quick **Use Template** selector in `BoardColumn.tsx`.
5. **Custom Fields Engine (`CardCustomFields.tsx`)**:
   - SQLite tables: `custom_field_definitions` and `custom_field_values`.
   - Axum endpoints under `/api/v1/custom-fields/` (CRUD for definitions & values).
   - UI: 6 data types supported (Text, Number, Currency, Dropdown, Checkbox, Date), with an in-modal definition creator.
6. **Card Voting & Kudos (`CardVoteButton.tsx`)**:
   - SQLite table: `card_votes (card_id, user_id, created_at)`.
   - Axum endpoint: `POST /api/v1/cards/{id}/vote`.
   - UI: Upvote button with counter badge on `CardHeader` and glowing vote pill on `CardItem`.

---

## 5. Phase 2: Multi-View Powerhouse & Board Ergonomics (NEXT TARGET 🎯)

*Focus: Transforming NEXA from a pure Kanban board into an omnichannel multi-view platform.*

### 5.1 High-Density Spreadsheet / Table View (`BoardTableView.tsx`)
- **Objective**: Provide an Excel/Airtable style view where developers and managers can view dozens of tasks simultaneously.
- **Capabilities**:
  - Columns: Title, Status (Column), Priority, Story Points, Assignees, Due Date, Labels.
  - Inline editing: Clicking any cell activates an inline editor (title text, priority dropdown, column dropdown, date picker) and saves immediately via TanStack mutation.
  - Quick column sorting and multi-field filtering.
- **Route**: Accessible via tab switcher on `BoardPage.tsx` (`Board` | `Table` | `Timeline` | `Calendar`).

### 5.2 Interactive Timeline / Gantt Chart (`BoardGanttView.tsx`)
- **Objective**: Visual chronological view based on `start_date` and `due_date`.
- **Capabilities**:
  - Horizontal calendar timeline with zoom scales (Days, Weeks, Months).
  - Task bars with color-coding matching card covers or priorities.
  - Connecting dependency lines (using `card_links` where `link_type = 'blocks'`).
  - Milestone markers (diamonds for 0-duration milestones).
  - Drag-and-drop to adjust start/end dates.

### 5.3 Monthly & Weekly Calendar View (`BoardCalendarView.tsx`)
- **Objective**: Full calendar representation of scheduled deliverables.
- **Capabilities**:
  - Month view grid and 7-day week view.
  - Multi-day spanning bars for tasks with `start_date` and `due_date`.
  - Drag-to-reschedule (dragging card to another day updates `due_date`).
  - Clicking any calendar card opens `CardDetailModal`.

### 5.4 Swimlanes & Board Grouping
- **Objective**: Group Kanban columns horizontally into distinct rows.
- **Options**:
  - **By Assignee**: Unassigned row + rows per team member.
  - **By Priority**: Urgent row -> High row -> Medium -> Low.
  - **By Epic**: Cards grouped by parent initiative.
- **UX**: Collapsible rows with card count badges.

### 5.5 WIP (Work In Progress) Column Limits
- **Objective**: Kanban best practice to prevent bottlenecks.
- **Schema**: `board_columns` table already has `wip_limit INTEGER`.
- **UX**:
  - If column card count > `wip_limit`: Column header border turns amber/red, shows `(8/5 WIP Exceeded)`.
  - Gentle toast/banner warning when dragging a card into an overcrowded column.

### 5.6 Column Card Sorting & Bulk Actions
- **Column Header Sort Menu**: Sort column by Due Date (soonest first), Priority (highest first), Title (A-Z), or Date Created.
- **Bulk Action Toolbar**: Checkboxes on cards allowing multi-select to:
  - Bulk move column.
  - Bulk reassign members.
  - Bulk delete or archive.

---

## 6. Phase 3: Scrum & Agile Lifecycle Engine

*Focus: Sprint execution, backlog grooming, and velocity metrics.*

### 6.1 Product Backlog Drawer (`BacklogPage.tsx`)
- Dedicated backlog space where future tasks sit outside the active sprint board.
- Ability to organize tasks into Sprints or "Backlog".
- Sprint header with "Start Sprint" button and total estimated story points.

### 6.2 Sprint Lifecycle & Runner
- **Start Sprint Modal**: Set sprint name, duration (1, 2, 3, or 4 weeks), start date, end date, and sprint goal.
- **Active Sprint Banner**: Shows days remaining, progress bar of completed points.
- **Complete Sprint Modal**: Overview of finished vs. unfinished cards, option to roll unfinished cards to Backlog or Next Sprint.

### 6.3 Burndown & Velocity Charts
- **Burndown Chart (`BurndownChart.tsx`)**:
  - Ideal burndown line (from total sprint points to 0).
  - Actual remaining points line recorded daily.
- **Velocity Chart (`VelocityChart.tsx`)**:
  - Bar chart comparing committed points vs. completed points across the last 5 sprints.

### 6.4 Epics & Initiatives
- **Table**: `epics (id, project_id, name, summary, color, status, start_date, target_date)`.
- Link cards to epics via `epic_id`.
- Epic completion percentage calculated dynamically from child cards.

---

## 7. Phase 4: Workflow Automation & Power Rules (Butler)

*Focus: Event-driven no-code automation.*

### 7.1 Automation Rules Table (`automation_rules`)
```sql
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'card_moved', 'card_created', 'checklist_completed', 'due_date_reached'
  trigger_config_json TEXT NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL,  -- 'set_priority', 'add_label', 'assign_user', 'mark_checklist_done', 'archive_card'
  action_config_json TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
```

### 7.2 Backend Event Bus
- Axum event dispatcher in `server/src/features/activity/` or dedicated automation runner.
- When `move_card` or `update_card` executes: inspect active project rules and trigger actions automatically.

### 7.3 Scheduled Background Maintenance
- Background Tokio cron task checking for rules like:
  - "Archive cards in Done column older than 14 days".
  - "Flag overdue cards with 'Overdue' label".

---

## 8. Phase 5: Enterprise Governance, Integrations & Power-User Tools

*Focus: Integrations, developer ecosystem, keyboard shortcuts, and export/import.*

### 8.1 Power-User Keyboard Shortcuts
- Global key listener in React:
  - `c`: Archive focused card.
  - `m`: Open assignee selector.
  - `l`: Open label selector.
  - `d`: Open due date picker.
  - `space`: Assign/unassign current user.
  - `?`: Toggle keyboard shortcuts cheatsheet modal.

### 8.2 Data Export & Import
- Export project board to **CSV** or full **JSON**.
- Import from **Trello JSON export** to instantly migrate existing boards into NEXA.

### 8.3 GitHub Smart Commits Webhook
- Webhook endpoint: `POST /api/v1/integrations/github/webhook`.
- Parses commit messages (e.g. `CARD-01a12c: Fix memory leak #done`).
- Automatically appends commit hash to the card activity stream and moves card if status tag provided.

### 8.4 Slack & Discord Notifications
- Webhook dispatcher posting rich markdown cards to configured Slack/Discord webhook URLs on high-priority alerts or blocker flags.

---

## Quick Reference Commands

```bash
# Check Rust backend compilation
cd mission-control/server && cargo check

# Run Rust backend
cd mission-control/server && cargo run

# Run Frontend test build
cd mission-control/client && pnpm build

# Run Frontend dev server
cd mission-control/client && pnpm run dev
```
