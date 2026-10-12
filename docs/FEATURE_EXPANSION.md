# Feature expansion and real-time operation

This implementation expands the five-phase roadmap. It provides a self-hosted web application; it does not claim complete parity with every Jira/Trello edition or Marketplace extension.

## Where to find the additions

| Feature | Location and scope |
| --- | --- |
| Live task updates | Top bar shows **Live** after an authenticated WebSocket connects. Edits, moves, comments, checklists, attachments and project changes invalidate active queries in other authorized sessions. |
| Personal Inbox | Sidebar → Inbox, Planner & workspace work → Inbox. Private quick capture, completion and atomic conversion to a project task. |
| Personal Planner | Workspace command center → Planner. Reserve dated focus-time blocks, optionally linked to a task. |
| Views across projects | Workspace command center → All projects, Workspace calendar or Portfolio timeline. Search/filter and date-range scheduling across accessible projects. The workspace list is capped at 5,000 tasks. |
| Workload and capacity | Workspace command center → Workload. Compare upcoming and unscheduled estimates with weekly availability. Workspace administrators configure hours. This is an estimate-based view, not an automatic scheduler or holiday calendar. |
| Work types | Project settings → Work types. Classify cards with project-specific types. Types currently share the project's fields and workflow. |
| Workflow transitions | Project settings → Workflow transitions. Allowed column routes, description/checklist gates, member/admin restrictions, and approvals. Once a transition exists, other routes must be explicitly configured. |
| Approvals | Task → Process & recurring work. A different administrator approves a specific task revision. Changing the task invalidates the approval. Manual, bulk and automated moves obey the workflow. |
| Recurring tasks | Task → Repeat every N days. Completion creates a fresh occurrence on the next worker tick, retaining the completed source. It copies description, estimates, labels, assignees and reset checklists; attachments/comments/history are not duplicated. |
| Due reminders | Task → Due-date reminder. The minute worker creates in-app reminders for assignees/watchers who still have access. Date-only deadlines use UTC midnight for reminder calculation. |
| Richer automation | Automation → Create/edit rule. Optional priority/assignee/label conditions and up to ten ordered actions. A sequence rolls back if an action fails. |
| Task mirrors | Board → Mirror a task. Displays the source task on another board and opens the same record for editing. Source workflow/permissions remain authoritative; mirrors are shown in a separate board section. |
| Advanced search | Command palette. Supports AND, OR, NOT, parentheses, quoted values, equality/inequality, date and numeric comparisons. This is a smaller language than JQL, without historical predicates or arbitrary functions. |
| Reports | Insights → Flow & cycle-time reports. Cumulative flow from recorded status history, cycle-time scatter, median and 85th percentile. History starts when tracking is enabled; no past workflow history is invented. |
| Shared board templates | Project settings → Workspace board templates. Workspace administrators snapshot/apply task fields and list names. These are reusable task/list blueprints, not full project configuration clones. |
| Request forms | Project settings → Request forms. Shareable title/description intake, optional required description and configured destination. Tokens are hashed; the link is shown when created. Delete a form to revoke the link. Public intake is limited to 20 submissions per form per minute. |
| Project visibility | Creation dialog or Project settings → Project visibility. Workspace-visible or private; changing access requires confirmation. |
| Project membership | Project settings → Project members. Add registered workspace members to private projects, change project roles and remove explicit access. Workspace administrators inherit access; assignment pickers use project members. |
| Member permissions | Project settings → Project member permissions. Configure create/edit/move/archive/comment/upload capabilities. Owners/admins retain management access and viewers remain read-only. Arbitrary roles and individual-card access lists are not included. |
| Two-factor authentication | Settings → Two-factor authentication. Password sign-in supports TOTP, replay protection, attempt throttling and ten single-use recovery codes. Secrets are encrypted using AES-256-GCM. Existing bearer sessions remain valid until expiry; SSO follows provider policy. |
| Desktop notifications | Settings → Desktop notifications. Opt-in mentions, assignments, watched comments and reminders while the application is open in a background tab. This does not deliver closed-app mobile push or email notifications. |
| Development panel | Task → Development. Signed GitHub/GitLab events link pull/merge requests, workflow/pipeline builds and GitHub deployments. Include `CARD-<full task UUID>` in the title, description or branch. Provider webhooks must be configured. |

## Search examples

```text
priority:high AND NOT status:done
(label = "Customer Bug" OR type:Bug) AND assignee:me
points >= 5 AND due <= 2026-10-31
project:TASK AND (status:active OR status:backlog)
updated >= 2026-10-01
```

Supported fields: `priority`, `status` (column category or name), `project` (identifier or UUID), `assignee` (username/UUID or `me`), `label` (name/UUID), `type`, `overdue`, `points`, `hours`, `due`, `created`, and `updated`. Date values can use `today`. Results retain workspace/private-project authorization and are limited to 100 matches.

## WebSocket deployment and behavior

- The browser connects to `/api/v1/realtime/socket` using `ws` on localhost and `wss` on HTTPS. Authentication is sent in the first frame, never in the URL.
- Origin checks require the browser's origin to match the request Host. The Vite and Nginx proxies preserve Host and forward upgrades.
- Unauthorized connections close after five seconds. Authenticated connections revalidate tokens every 25 seconds and check project access before delivering project events. Connection capacity is bounded at 256 sockets per process.
- Events contain identifiers and invalidation signals, not task contents or restricted comments. The browser batches invalidations for 50 ms, refetches active queries, and preserves optimistic local drag operations.
- Reconnection uses exponential backoff and jitter, capped at about 15 seconds. A reconnect/lagged channel triggers a resync from the API. Permission changes reset cached queries.
- This is a single-process broadcast hub. Running multiple Rust replicas requires a shared event bus; that distributed deployment is not implemented.

## Authenticator storage and backup

Set a stable `MFA_ENCRYPTION_KEY` in the server environment, or the server creates `local-mfa.key` beside its SQLite database with private filesystem permissions. Back up this key alongside the database, uploads and configuration. Restore the same key; changing it requires re-encrypting existing authenticator secrets. Never place it in Git or a public artifact.

TOTP setup needs your current password. Add the setup key to an authenticator app, confirm a six-digit code, and save the displayed recovery codes. Recovery codes are hashed in the database and can be used once. Native two-factor protection applies to password sign-in; enforce SSO MFA at the identity provider.

## Integration configuration and remaining scope

See [INTEGRATIONS.md](INTEGRATIONS.md). GitHub supports pull-request, workflow-run and deployment events in addition to push events; GitLab supports merge-request and pipeline events. Payload formats follow the [GitHub webhook documentation](https://docs.github.com/en/webhooks/webhook-events-and-payloads) and [GitLab webhook documentation](https://docs.gitlab.com/user/project/integrations/webhook_events/).

The project still does not include external-calendar OAuth synchronization, cloud-drive file synchronization, an AI provider/agent layer, a general plugin marketplace/SDK, separate native mobile applications, or a complete Jira service desk. Provider credentials/configuration and native application projects are separate work. SAML uses the existing OIDC broker adapter.

JSON exports include the new project metadata but omit form tokens, authentication secrets, personal Inbox/Planner data and attachment bytes. Imports restore task fields/lists, not complete project configuration. Full recovery uses SQLite backup, uploads and the encryption/configuration files.

## NEXA visual consistency and modal fixes

Mission Control uses the same light/dark brand and surface tokens as `frontend/src/app/globals.css`. The frontend Input, tooltip and checkbox implementations are ported locally; compatibility adapters retain existing Mission Control call sites. Button, badge, card and textarea styling follows the frontend components. Brand chrome uses teal/petrol; task labels and cover colors remain configurable.

Dialogs render in a body portal, stay within the dynamic viewport and provide a bounded, overscroll-contained content area. Task details use that shared scroll area, avoiding clipped nested flex containers. Browser verification covered scrolling to the last task field and a remote task title update while both detail dialogs remained open.
