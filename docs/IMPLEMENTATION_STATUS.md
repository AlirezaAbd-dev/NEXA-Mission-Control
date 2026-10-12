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

These features extend the application; they do not imply full Jira/Trello or Marketplace parity. External calendar/drive synchronization, AI, a plugin SDK/marketplace, arbitrary custom roles, individual-card access lists and separate native apps remain outside this implementation.

Expansion validation: 31 backend tests, 6 frontend tests, 31 live HTTP/WebSocket checks, TypeScript/lint and production builds passed. A title edit was verified in a second browser session without reloading. The latest local mutation-to-WebSocket benchmark measured 13.3 ms median and 40.7 ms maximum across eight edits; this is local delivery timing, not a production latency guarantee.

NEXA visual verification: reused frontend color tokens, locally hosted Manrope/Vazirmatn fonts, Input/tooltip/checkbox implementations and aligned primitive styling. Removed legacy blue accents and dark slate surfaces. Shared portal dialogs constrain content to the dynamic viewport; scrolling reached the last task action. Fresh browser loads showed no console errors.
