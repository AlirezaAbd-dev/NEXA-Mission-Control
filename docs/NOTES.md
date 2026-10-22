# Notes

Open **Notes** in the workspace sidebar, below Planner & Work Hub, or use the command palette. On desktop the list and editor appear side by side. On mobile, **All notes** returns to the list.

The default **All** tab combines your personal notes and notes from every workspace you currently belong to. Each row has a lock or workspace icon and a scope label with its workspace name. Personal and current-workspace tabs narrow the list. Trash is a separate filter that works with every tab; All + Trash includes recoverable notes across all accessible scopes. Creating from All is explicitly labeled **New personal note** to avoid accidentally sharing content.

## Access and applicability

Notes support all business activities. This standalone application introduces no CRM sales, subscription, or customer-AI restrictions. The API checks ownership and current database membership independently of UI controls and claimed token roles.

- Personal notes are private to their creator and remain available across workspace switches.
- Workspace notes are readable by current workspace members. Viewers have read-only access; other workspace roles can create, edit, pin, trash, restore, and manage links.
- Scope cannot be changed after creation. Use personal notes for private content: shared notes are readable by the whole workspace, regardless of project memberships.
- Revoking workspace membership removes access; shared notes remain for the other members.

## Writing and organization

The existing rich-text editor supports formatting, tables, lists, links, images, and RTL/LTR/automatic direction. Titles are required, with a 160-character limit; bodies allow 500,000 characters. Edits autosave after a 700 ms pause, with visible saving/error states. Unsaved changes trigger navigation/browser-close protection. Drafts are not durable offline storage.

SQLite FTS5 searches titles and bodies, including Persian text, without an external service. Pinned notes appear first, then the most recently updated. Each scope/search shows up to 200 results, including in Trash.

Task links do not move or modify tasks. Shared notes link only to tasks in their workspace. Link responses recheck task/project visibility and hide inaccessible private-project titles; linking does not grant access. Trash retains text and links, and Restore recovers them. Permanent note deletion is not included.

Tasks now have a **Linked notes** section with scope icons and names. Open a note, attach an existing editable personal or same-workspace note, or create a new personal/shared note. Creating from a task validates task access and saves the note and link together in one database transaction before opening the editor. Viewers may create personal notes; shared creation requires workspace write access. Unlinking keeps both records. Trashed notes disappear from the task's active list and return when restored. Task note queries recheck current task access and note ownership/membership, so private notes never become visible to other task viewers.

## Concurrent changes

Updates carry the editor's original version. The API rejects stale writes with HTTP 409 instead of overwriting another revision. Dirty drafts keep their original version when remote updates arrive. After an error, saving pauses until **Retry save**, **Reload latest**, or **Save personal copy**. Reload asks for confirmation because it discards the draft; saving a personal copy preserves it separately.

WebSocket notifications refresh queries. Personal events target only the owner's sessions; shared notes use the existing workspace event. Events contain no note body. Synchronization uses refresh and conflict detection, not character-level coediting. Version history, collaborative cursors, project-specific notebooks, and custom per-note sharing are not included.

## API and rollout

All endpoints require authentication:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/notes` | List; accepts `scope` (`all`, `personal`, `workspace`), `workspace_id`, `q`, `trash`, optional `card_id` for permission-filtered task backlinks |
| POST | `/api/v1/notes` | Create; omit `workspace_id` for personal; optional `card_id` creates the link atomically |
| GET | `/api/v1/notes/{id}` | Read content and effective edit permission |
| PUT | `/api/v1/notes/{id}` | Update title/body/pin/trash with required `version` |
| GET / POST | `/api/v1/notes/{id}/links` | List accessible links / add `card_id` |
| DELETE | `/api/v1/notes/{id}/links/{card_id}` | Remove link without deleting the task |

The additive `20261022000000_notes.sql` migration creates notes, links, indexes, and FTS maintenance triggers. Startup applies it automatically. Back up the database and uploads; deploy the API before the updated client. Notes use existing authentication, SQLite, uploads, and WebSocket infrastructure, with no new packages or external API keys. Database backups retain notes and trash; image files require uploads backups.

## Verification

All 57 backend tests and 19 frontend tests pass, along with the production build and lint (warnings remain). Notes tests cover privacy, current workspace roles, authenticated routes, stale-write conflicts, Persian search, trash/restore, private-project link filtering, and scoped events. All-scope/backlink tests cover membership revocation, read-only roles across workspaces, private notes, task visibility, invalid/cross-workspace creation without partial records, and trash restoration of links. Isolated browser checks cover autosave, pinning, task links, trash/restore, preserving concurrent revisions, personal-copy recovery, All-tab scope icons, task attach/unlink/create/open, and 390 px layouts without horizontal overflow.
