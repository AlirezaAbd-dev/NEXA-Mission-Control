# Workspace overview

The `/w/:workspaceId` overview is a daily workspace dashboard. It supports all business activities as a shared feature. Mission Control has no CRM sales/subscription/activity policy; this change introduces no customer-AI behavior. Current workspace membership AND project visibility remain required. No role or entitlement is granted by visiting the dashboard.

## Sections

- **Summary:** visible active projects, open tasks, overdue tasks, completed tasks, and the number of open tasks assigned to the current user. Counts are calculated over all eligible records, independently of preview limits.
- **My tasks:** overdue, today, and upcoming/undated groups, with up to six open assigned tasks in each group. Open Work Hub leads to the wider task list.
- **Needs attention:** up to six open tasks that are overdue, urgent, or blocked, prioritizing earlier deadlines. The badges show workspace totals; a task may match multiple badges.
- **Project progress:** completed/total task counts and percentages, overdue counts, earliest outstanding deadline, and direct board links. Empty projects show 0%, rather than claiming completion. Existing administrator edit/delete actions remain available.
- **Upcoming deadlines:** up to six open tasks due today through six days ahead, ordered by deadline and priority.
- **Pinned notes:** the six most recently updated pins shared in this workspace or privately owned by the current user. Personal pins remain available across workspaces. Deleted notes and other users' personal notes never appear.
- **Recent task activity:** the latest eight permitted task events, with actor, action, current task title, project, and time. Raw audit payloads and comment contents are not returned. Only a safe set of task-change action types is included; the task modal retains its detailed history.
- **Quick actions:** Planner, Write a note, and Create task. Writing creates a personal note and opens its editor. Task creation offers only accessible writable projects and their actual columns, then opens the created task. Existing task creation APIs recheck permissions and column ownership.

Every task row opens its task modal. Pins open the correct personal/workspace note. Read-only users can inspect permitted work and write private notes, but cannot create shared tasks. There is no automatic assignment when creating a task; assign it through the task modal.

## Dates and scope

The client sends its local Gregorian calendar day as `today=YYYY-MM-DD`, refreshing that value at least once per minute. The API validates it. Due dates are grouped by their stored date portion rather than shifting date-only values through UTC. Due today is not overdue. Completed and archived tasks, task templates, and archived projects are excluded from open work; completion counts include unarchived, non-template completed tasks.

Blocked status means an unfinished, unarchived task has an unfinished, unarchived blocker through `blocks` or `blocked_by`. Both tasks' projects must be visible and active. Hidden dependencies are omitted to avoid revealing private project activity. Self-links and completed blockers do not count. Existing work records and historical audit entries are never changed by loading this page.

The dashboard reads current database membership and effective project roles, including project viewer overrides. Its aggregate queries apply the same scope to counts, lists, and dependencies. The workspace-specific query key prevents cross-workspace cache reuse. Access errors hide old dashboard data; role changes use the existing permissions refresh. Existing WebSocket invalidation refreshes the dashboard after task/project changes, with a manual refresh available too.

## API, deployment, and validation

`GET /api/v1/enterprise/workspaces/{workspace}/dashboard?today=YYYY-MM-DD` requires authentication and current workspace membership. Its response contains `summary`, `projects`, the three `mine_*` groups, `attention`, `deadlines`, `notes`, `activity`, and the accepted `today` value. It returns bounded lists with uncapped counts. No external keys, packages, or background services are required.

The additive `20261022000001_dashboard_dependency_indexes.sql` migration indexes both dependency directions. Startup applies it automatically. Back up the SQLite database before rollout and deploy the API before the client. No existing schema fields or records are removed.

Validation: all 61 backend tests and 19 frontend tests pass. Backend cases cover authentication, forged global-role claims, outsider denial, private-project visibility, viewer overrides, revoked membership, workspace switching, archive/template exclusion, exact totals beyond preview limits, calendar boundaries, completed blockers, note privacy, and audit-payload omission. Browser checks against a disposable database verify populated sections, task groups, create-and-open, private-note creation, and 390 px dashboard/dialog layouts without horizontal overflow. The frontend production build and lint pass; existing warnings remain.
