# Enterprise implementation report

Implemented on `feature/enterprise-roadmap` against the original enterprise roadmap. The original plan remains the requirements reference; this report records the delivered scope.

| Phase | Delivered behavior |
| --- | --- |
| 1 — Card productivity | Dates, priorities, checklists with dates/assignees, durable attachments and covers, Markdown, comments and mentions, watchers, votes, time tracking, custom fields, templates, task relationships, subtasks, archive/restore. |
| 2 — Views and boards | Editable table and bulk actions, month/week calendar rescheduling, timeline drag/resize and dependency arrows, swimlanes, WIP warnings, column sorting, user themes, starred boards, saved filters. |
| 3 — Agile lifecycle | Backlog, sprint planning/start/completion and carryover, daily snapshots, burndown and velocity, epics and releases with progress, downloadable changelogs. |
| 4 — Automation | Create/move/checklist events, scheduled due/aging/SLA rules, manual card/board actions, action validation, idempotent execution and audit records. |
| 5 — Governance and integration | Workspace/project roles, private-project access controls, internal comments, scoped audit/search, tokens, export/import, signed provider webhooks, OIDC, document links, keyboard actions, deep links, PWA shell. |

## Configuration and boundaries

- GitHub, GitLab, signed inbound email, Slack, Discord and OIDC adapters require provider configuration. No production services or external provider accounts were changed.
- SAML sign-in uses an OIDC broker. There is no native SAML assertion parser.
- Figma embeds and cloud-drive document links reference provider-hosted content. They do not synchronize files or provision provider OAuth accounts.
- Trello/native imports restore task fields and lists, with a 5,000-card limit. They are not full workspace backup restoration.
- JSON exports include board objects and metadata, excluding provider secrets, password hashes and attachment bytes. Use SQLite online backup plus uploads/configuration for full disaster recovery.
- PWA caching covers the application shell and static assets. The API and uploads remain online-only.
- Desktop/tablet/mobile layouts are responsive; a separate native mobile app is not included.

See [INTEGRATIONS.md](INTEGRATIONS.md) for setup.

## Verification

Automated backend tests cover authorization, private-project boundaries, atomic bulk operations, sprint transitions, hierarchy validation, automation idempotency, internal-comment privacy, SLA response tracking, import validation, XLSX structure and webhook signatures. Frontend tests cover date rescheduling and safe Markdown rendering. TypeScript, lint and production builds are checked.

Local HTTP acceptance checks exercise automation, sprint lifecycle, archive/restore, exports/imports, tokens, provider signature/deduplication behavior, permissions, search and audit. Browser checks exercise local sign-in and board views. These checks do not constitute end-to-end tests against configured third-party provider accounts. Native development services are run locally; Docker configuration is validated, but a production deployment is not performed.

The expanded local run passed 31 backend tests, 6 frontend tests and 31 live HTTP/WebSocket acceptance checks. TypeScript and the production build passed; browser verification covered the board, task details and cross-session WebSocket updates. Compose configuration and Git whitespace checks passed.
## Expansion beyond the original roadmap

See [FEATURE_EXPANSION.md](FEATURE_EXPANSION.md) for the new WebSocket transport, private Inbox, focus-time Planner, workspace calendar/portfolio timeline, team capacity, work types, workflow gates, revision-bound approvals, recurrence/reminders, ordered automation, shared task mirrors, Boolean search, flow reports, workspace templates, request forms, member permissions, native TOTP and desktop notifications. Signed provider events now populate a task development panel.

These features extend the application; they do not imply full Jira/Trello or Marketplace parity. External calendar/drive synchronization, AI, a general plugin SDK/marketplace, individual-card visibility lists and separate native apps remain outside this implementation. Custom task-action roles are included in the local operations extension below.

Expansion validation: 31 backend tests, 6 frontend tests, 31 live HTTP/WebSocket checks, TypeScript/lint and production builds passed. A title edit was verified in a second browser session without reloading. The latest local mutation-to-WebSocket benchmark measured 13.3 ms median and 40.7 ms maximum across eight edits; this is local delivery timing, not a production latency guarantee.

NEXA visual verification: reused frontend color tokens, locally hosted Manrope/Vazirmatn fonts, Input/tooltip/checkbox implementations and aligned primitive styling. Removed legacy blue accents and dark slate surfaces. Shared portal dialogs constrain content to the dynamic viewport; scrolling reached the last task action. Fresh browser loads showed no console errors.

## Credential-free local operations

The new local operations extension implements custom action roles, per-task action rules, a signed-in service desk with private staff notes and linked tasks, published/draft knowledge articles, elapsed-hour SLAs, a declarative local plugin catalog, same-host multi-process WebSocket forwarding and a maintenance lease. New totals: 36 backend tests, 8 frontend tests and 12 additional live acceptance checks. See [LOCAL_OPERATIONS.md](LOCAL_OPERATIONS.md). Full task visibility ACLs, multi-host scaling, external-provider features and complete Jira Service Management parity are not claimed. Native apps were excluded by the user.

## Detailed audit history

Task history and project audit now present readable field-by-field previous/new values, actor names, exact timestamps and expandable event metadata. Safe task snapshots include statuses, assignments, labels, scheduling, estimates, checklists, files and process settings; private comment content and credentials are excluded. Bulk changes and automations capture changes inside their transactions. Generic request snapshots describe the task state around the successful request. Older events retain their originally recorded metadata; past values are not reconstructed. Validation totals: 38 backend tests, 10 frontend tests, TypeScript/lint, production build and a live field/status change check passed.

## Task modal UI/UX refinement

The task modal now has a full-width compact cover and fixed header, an always-visible close control, a wider desktop layout with independently scrollable details/properties panes, and a Details/Properties switch below the desktop breakpoint. Checklist metadata uses separate labeled rows. Workflow/template/custom-field settings are grouped in a disclosure. Title editing supports Enter/Escape with focus restoration; custom selects support arrow navigation and Escape closes the menu first. Browser checks covered 1280×900 and 390×844 layouts, zero horizontal overflow, scrolling, mobile pane switching and keyboard cancellation. TypeScript, lint and production builds passed.

### Checklist editing and removal

Checklist titles and item titles now have explicit edit controls. Both checklist and item deletion require a named confirmation; checklist deletion removes its items. Renames validate trimmed title lengths, preserve task edit permissions, and appear in audit history. Verified through the running UI and disposable local API data, including persisted renames and cascade deletion. Validation: 39 backend tests, 10 frontend tests, TypeScript, lint, and production build pass.

### Discoverable task removal

The task modal header now exposes Remove task on desktop and mobile, with confirmation, pending protection and API error feedback. Removal archives the task and closes the modal; active views and archive caches refresh. Restorable removal retains task data. The archive endpoint now consistently checks archive permission for removal and restoration. Verified UI removal on disposable data, API archive and restore, 40 backend tests, 10 frontend tests, TypeScript, lint and production build.

### Shared NEXA controls and Mission Control branding

Adapted the frontend date-picker design with Gregorian dates, local date-only parsing, date-time selection, date bounds, viewport-aware positioning and keyboard dismissal. Date and date-time Input fields across the app use this control. Dropdown menus, regular selections and searchable selections use the frontend NEXA primitives through compatibility wrappers; keyboard navigation works inside task modals. Existing NEXA inputs, checkboxes, buttons and tooltips remain shared in appearance and behavior.

Active product labels, seed content, API health, logs, Rust package/binary and browser storage now use Mission Control. The upgrade migration renames existing welcome text. Browser storage is migrated so sessions and themes survive. New database configuration uses mission-control.db; startup recognizes an existing legacy database rather than creating an empty app. Historical SQL migration checksums are preserved. Rich text editor work is deferred at the user's request; no editor dependencies or partial editor files are included.

Validation: 40 backend tests, 13 frontend tests, TypeScript, lint, production build, live calendar/dropdown dismissal and local date persistence checks.

### Board column management

Each column's actions menu now includes Rename column with trimmed 1–50 character validation and API error feedback. Reorder columns opens a NEXA modal with drag handles, keyboard sorting and up/down buttons; Save order applies the draft to all swimlanes. Reordering updates the cached board immediately and rolls back on failure. The API validates the complete set of board columns and saves positions within one transaction, rejecting foreign, duplicate, missing and stale column sets. Viewer/outsider authorization and successful realtime change publication are covered by backend tests.

Verified live against a disposable local board: rename, arrow movement, keyboard drag, saving, reload persistence and cleanup. Targeted board TypeScript checks and lint pass. The full client build remains blocked by pre-existing missing Tiptap dependencies; an isolated preview used the actual board components with the unrelated editor export omitted.

### Task drop placement and animation

Task dragging now displays a NEXA insertion marker at the exact drop slot, including empty columns. Pointer movement uses the hovered card's upper/lower half; keyboard dragging supports same-column ordering and cross-column moves. Preview cards use a distinct disabled sortable ID, and conflicting sortable/return animations are disabled. A transient placement handoff keeps the dropped task at its destination while cache notifications and requests finish. Failed requests roll back the affected positions and display an error; cancellation does not mutate data. Marker state only updates when the intended slot changes.

Moves can include an optional before-task placement anchor. The server calculates fractional positions in a transaction, rebalancing only when duplicate or exhausted position values require it. Legacy position-only clients retain their existing API. Existing tasks with equal position values can therefore be inserted between correctly. Tests cover tied positions, invalid anchors, before/after slots, empty columns and shared placeholder/save calculations.

Validation: 44 backend tests, 17 frontend tests, targeted board TypeScript and lint; isolated browser preview verifies keyboard reorder, cross-column movement, cancellation, pointer insertion, empty-column drops and persisted API state. Full-project client checks remain limited by the pre-existing missing editor dependencies. Disposable preview and test records were removed.

## Permanently deleting archived tasks

Archive now offers a red Delete action with a task-specific, irreversible-action confirmation. Eligibility is shared across all business activities: the task must still be archived AND the actor must currently be a project/workspace owner or admin. Existing project visibility and centralized authorization remain authoritative; changing activities grants no access. The UI uses the existing local-operations session capability, hides deletion until access is confirmed, supports loading/error/retry states, and wraps actions on mobile. No customer AI, sales, subscription, or historical-obligation behavior changes.

The additive `DELETE /api/v1/cards/{id}/permanent` endpoint rechecks access and conditionally deletes only archived rows in a transaction, with a project audit entry committed atomically. Related task-owned rows cascade; subtasks and service-desk records remain with their parent/task link cleared. Existing project audit history is retained. Unreferenced attachment files are removed after commit where possible; shared files and unsafe paths are preserved, and file cleanup failure does not undo or misreport a committed deletion. Ordinary Remove task continues to archive, preserving restore behavior. Successful deletion invalidates affected caches and publishes the existing project real-time event.

Validation: 49 backend tests and 19 frontend tests pass; frontend production build and focused lint pass. Tests cover archived-state enforcement, effective database roles (not claimed JWT roles), cross-workspace denial, cascades, audit retention, linked records, shared uploads, and real-time publication. Disposable local browser checks covered confirmation/cancellation, live archive removal following an API deletion, mobile wrapping, and hiding controls after admin access is revoked. No existing user tasks were deleted. Deploy the additive API before serving the updated client.

## Workspace context and profile settings

Workspace selection is shared by the sidebar, dashboard, and Settings and remembered per account in browser storage. Explicit workspace/project routes establish context; visiting generic pages retains that choice. Missing workspace memberships fall back safely to an accessible workspace.

Settings opens on My profile with editable display name and photo, image preview, reset/save controls, pending protection, and validation feedback. Authenticated avatar uploads accept PNG/JPEG/WebP/GIF up to 2 MB; names are trimmed and validated, and empty avatar values remove the photo. Username/email remain read-only sign-in identifiers. Profile updates refresh the current-user store, header, and relevant cached member/task data. Avatar files use the existing uploads storage, which must be included in backups.

Validation: 47 backend tests, 19 frontend tests, focused TypeScript and lint pass. Browser checks using an isolated database and the real Settings/sidebar components verified workspace switching, navigation to Settings, reload persistence, name save, image upload/rendering, removal, and API error recovery. Full-project client builds remain blocked by pre-existing missing Tiptap dependencies in the unrelated editor work.

### Dependency restoration and full validation

Restored the already-declared Tiptap 3.31.4 packages using the frozen pnpm lockfile. No dependency version changes were needed. The complete frontend TypeScript check and production build now pass; the previous missing-editor-dependency limitation is resolved. Final validation also passes all 47 backend tests and 19 frontend tests. Frontend lint exits successfully with eight existing warnings; Vite reports one existing large-chunk advisory. README documents restoring locked dependencies after pulling changes.

### Rich-text content direction

The editor now exposes LTR, RTL, and Auto controls for the current block or selected blocks, using Tiptap's built-in direction support with no additional dependencies. Direction is serialized in HTML `dir` attributes and restored when reopening content; English and Persian paragraphs can have independent directions. Selected state tracks editor selection changes. List indentation, quote borders, and empty-editor placeholders follow logical directions; automatic list items inherit their containing list direction to keep markers on the correct side.

Validation: full frontend build and lint pass (existing warnings remain), and 19 frontend tests pass. Browser checks verified LTR/RTL controls, multi-block selection, undo, automatic Persian direction, serialized reload persistence, read-only rendering, and RTL list markers using a disposable editor preview.
