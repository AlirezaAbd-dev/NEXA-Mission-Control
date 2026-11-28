# Navigation structure

This is a shared interface change for every business activity. Existing workspace membership, project visibility and API permissions continue to determine access; navigation preferences grant no permissions. No backend, customer-AI, cache infrastructure or deployment changes are required.

## Workspace and projects

The sidebar contains one workspace switcher, Overview, Work, Notes, a consolidated project list and Settings. Workspace creation is in the workspace actions menu. Project creation remains beside Projects. Favorites appear once with a star and are sorted ahead of recently visited projects. The sidebar shows six projects plus the current project when necessary; Browse projects searches the complete authorized workspace list. Private or archived projects are never reintroduced from browser history: recent IDs only rank the current API results.

Project view links no longer repeat in the sidebar. The project header contains Work, Backlog, Reports and Service desk. Work groups Board, Table, Calendar and Timeline in one view selector. Automation, Resources and Project settings remain in the named Tools menu. On mobile, a project navigation selector exposes all seven destinations in the existing native bottom sheet; Work has a separate view selector. Service desk remains accessible for existing projects without introducing a new enablement prerequisite.

The last Work view is stored per user and project. Recent projects are bounded to six per user and workspace. Browser storage errors and invalid values safely fall back to Board and an empty recent list. Sidebar and overview project links restore the saved view. A selected project is only highlighted on its own routes; the workspace overview does not select the first project implicitly.

## Settings and resources

Resources opens the existing document/design/cloud-file functionality directly. Project settings is divided into:

- **Members & access:** visibility, project members, member permissions, custom roles and task rules.
- **Workflow & service desk:** work types, transitions, request forms, board templates, SLAs and local plugins.
- **Integrations:** the existing integration configuration and MCP documentation.
- **Data & archive:** import/export, archived tasks and project details/destructive actions.
- **Audit history:** the existing audit log.

All original components and API routes remain. Existing `/p/:id/governance` links open Members & access; `?section=resources`, `workflow`, `integrations`, `data` and `audit` select the corresponding content. Browser back/forward works through section changes. Account and workspace configuration remains under the existing Settings page, whose active workspace selector retains the previously chosen workspace.

## Responsive and RTL behavior

The desktop sidebar has independent scrolling and a fixed Settings footer. Mobile navigation uses the shared Vaul sheet with focus management, dismiss behavior, internal scrolling and safe-area spacing. Existing selectors and menus also use that shared responsive behavior. New navigation uses semantic theme tokens, logical spacing, explicit accessible names and at least 44 px navigation targets. English and Persian labels are explicit catalog entries; project/workspace names remain unchanged and use automatic text direction.

Regression tests cover valid/invalid saved views, legacy route recognition, account/project/workspace isolation, denied storage, bounded recent history and catalog coverage. Browser verification uses an isolated demo database. Production data and deployment configuration are unaffected.

Verified the desktop layout at 1280 px and mobile layouts at 390 and 320 px in English/LTR and Persian/RTL, including project browsing, restoring Calendar after returning from Overview, starred project updates, project resources and grouped settings, and nested mobile sheets. Browser console checks returned no errors. Physical-device keyboards and assistive technology remain device-testing work.
