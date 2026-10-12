# Local operations expansion

This expansion stays inside the existing web application. It adds no external API keys, OAuth providers or native applications.

## Custom roles and task actions

Open **Project settings → Custom roles** as an owner/admin. Create a named role, select actions and assign it to registered project members. Actions are create, edit, move, archive, comment and upload. The optional **desk agent** capability grants service-desk triage, replies and article authoring.

Permissions intersect: project member policy AND custom role AND per-task rule. An absent role/task rule inherits policy; an empty action list denies actions. Owners/admins retain access; viewers cannot be promoted by a custom role. A desk-agent capability does not grant project access, task editing or administrator powers.

**Task action permissions** restrict actions for one member on one task. Normal HTTP edits, checklist/comment operations, bulk operations and manual macros enforce them. Reset restores inheritance. These are action restrictions, not private task visibility: readable tasks remain visible to project members. Project privacy still controls membership and read access. Administrator-configured scheduled automations remain system actions.

## Service desk and knowledge base

Open the **Service desk** project tab.

- Project members/viewers submit requests and see their own conversations.
- Owners/admins and members with desk-agent capability see the full queue, triage status/priority, assign eligible agents and add replies or internal notes.
- Internal notes and draft knowledge articles are only returned to desk agents. Published articles are searchable by project members.
- Default SLAs are 24 calendar hours for a first public agent reply and 72 hours for resolution. Configure them in Project settings; changed policies apply to new requests.
- Internal notes do not stop the response clock. Resolved/closed requests leave the overdue queue; reopening resumes checking the original deadlines. Pending status does not pause clocks.
- Agents with task-creation permission can convert a request to a linked task. Repeated conversion returns the same task.
- Tickets and tasks have independent workflows. Attachments belong to linked tasks; there is no dedicated ticket-file store.

Requests require a signed-in account with project access. Anonymous customer portals, email ingestion/delivery, business-hour calendars, organizations, satisfaction surveys and advanced service-desk approvals are not included. Existing optional provider integrations remain unchanged.

## Local plugin catalog

Project settings → Local automation plugins supports built-in examples and JSON manifest installation:

    {
      "schema": 1,
      "name": "Escalate task",
      "version": "1.0.0",
      "description": "Raise priority to urgent.",
      "actions": [{"type": "set_priority", "value": "urgent"}]
    }

Supported actions are set_priority, add_label, assign_user, mark_checklist_done, archive_card and move_card. IDs for targets must belong to the project. A manifest has 1–10 actions and is limited to 64 KiB. Only project administrators install, update, enable, disable, uninstall and run plugins. Runs use the existing transactional automation engine, workflow gates and audit history.

Plugins are declarative local action bundles. They do not execute JavaScript, shell commands or remote requests. Disabled plugins cannot be run through the macro endpoint. This is not a public marketplace or arbitrary-code plugin SDK.

## Multiple API processes on one VPS

API instances using the same SQLite file share change identifiers through realtime_outbox. The publishing process sends immediately to its local sockets; peer processes poll at 200 ms, apply the same per-user/project authorization and forward events. Missed retention windows reset client caches. Retention is capped at one hour/10,000 events.

A database maintenance lease keeps one process running recurrence/reminder/automation maintenance, with a 120-second failover interval. Start instances with the same database, upload directory, JWT_SECRET and MFA encryption key; give each a different PORT. Point the reverse proxy at the instances and retain WebSocket upgrade headers.

SQLite sharing must be on the same host/local filesystem. Do not place WAL-mode SQLite on a network filesystem. This does not add multi-host deployment, distributed storage or an external Redis cluster. No process-level configuration is needed for a single API.

## Verification and recovery

From the repository root, with the local demo API running:

    python3 scripts/check-local-operations.py

The script creates isolated QA records and removes them, exercises authorization/service desk/plugins and sends 48 local writes with eight workers. It uses the local demo account and loopback API only. It is not a production load test.

Automated verification passed 36 backend tests and 8 frontend tests. Live checks passed 12 new acceptance cases. Two actual local API processes delivered a first-process HTTP edit to a second-process authenticated socket in 105.9 ms. The 48-write check measured 19.0 ms median / 203.4 ms maximum HTTP latency on this development machine; these are measurements, not production guarantees.

For the native local runtime:

    python3 scripts/backup-local.py backups/mission-control.tar.gz

The archive is mode 0600 and contains an SQLite online backup, uploads, the local MFA key and env files if present. Stop application writes while taking a complete recovery archive so uploads/configuration remain consistent with the database. Environment-only configuration must be preserved separately. Docker named volumes need an equivalent volume backup; this script targets the native local layout.

Restore into a separate directory first, check the database with SQLite integrity_check, retain file permissions, restore the same encryption key and configure the original stable JWT_SECRET. Validate sign-in, uploads and MFA before directing traffic to a restored server. The production server requires JWT_SECRET of at least 32 characters; the known demo fallback is allowed only when MISSION_CONTROL_DEMO=1 is explicitly enabled.

Production deployment and merging this branch remain separate actions. No production VPS was modified.
