export type AuditPayload = Record<string, unknown>;
export const fieldLabels: Record<string, string> = {
  title: "Title",
  description: "Description",
  status: "Status",
  priority: "Priority",
  story_points: "Story points",
  estimated_hours: "Estimated hours",
  start_date: "Start date",
  due_date: "Due date",
  assignees: "Assignees",
  labels: "Labels",
  archived: "Archived",
  position: "Board order",
  cover: "Cover",
  epic: "Epic",
  parent_task: "Parent task",
  release: "Release",
  response_sla: "Response SLA",
  resolution_sla: "Resolution SLA",
  checklist_items: "Checklist items",
  public_comments: "Public comments",
  logged_minutes: "Logged minutes",
  attachments: "Attachments",
  work_type: "Work type",
  repeat_days: "Repeat interval (days)",
  reminder_minutes: "Reminder lead time (minutes)",
  custom_fields: "Custom fields",
};
export function labelFor(key: string) {
  return (
    fieldLabels[key] ||
    key
      .replaceAll("_", " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}
export function auditPayload(raw: unknown): AuditPayload {
  if (typeof raw === "string") {
    try {
      return auditPayload(JSON.parse(raw));
    } catch {
      return { note: raw };
    }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as AuditPayload)
    : {};
}
export interface ChangeDetail {
  field: string;
  before: unknown;
  after: unknown;
}
export function auditChanges(payload: AuditPayload): ChangeDetail[] {
  const value = payload.changes;
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([field, pair]) =>
    field !== "position" &&
    pair &&
    typeof pair === "object" &&
    !Array.isArray(pair) &&
    "before" in pair &&
    "after" in pair
      ? [
          {
            field,
            before: (pair as AuditPayload).before,
            after: (pair as AuditPayload).after,
          },
        ]
      : [],
  );
}
export function auditSummary(action: string, payload: AuditPayload): string {
  const changes = auditChanges(payload);
  if (changes.length) {
    const names = changes
      .slice(0, 3)
      .map((c) => labelFor(c.field))
      .join(", ");
    return (
      (action === "automation_executed"
        ? "Automation changed "
        : action === "bulk_action"
          ? "Bulk changed "
          : "Changed ") +
      names +
      (changes.length > 3
        ? " and " +
          (changes.length - 3) +
          (changes.length === 4 ? " more field" : " more fields")
        : "")
    );
  }
  if (
    payload.changes &&
    typeof payload.changes === "object" &&
    "position" in payload.changes
  )
    return "Reordered this task";
  const labels: Record<string, string> = {
    created_card: "Created this task",
    moved_card: "Moved this task",
    member_added: "Assigned member",
    member_removed: "Unassigned member",
    updated_card: "Updated this task",
    updated_task_links: "Updated task links and deadlines",
    automation_executed: "Ran an automation",
    bulk_action: "Applied a bulk action",
    removed_attachment: "Removed an attachment",
    uploaded_attachment: "Uploaded an attachment",
    updated_process_settings: "Updated process settings",
  };
  if (
    action === "moved_card" &&
    (payload.from_column || payload.from) &&
    (payload.to_column || payload.to)
  ) {
    return `Moved from "${payload.from_column || payload.from}" to "${payload.to_column || payload.to}"`;
  }
  if (action === "member_added" && payload.assignee) {
    return `Assigned ${payload.assignee}`;
  }
  if (action === "member_removed" && (payload.removed_assignee || payload.assignee)) {
    return `Unassigned ${payload.removed_assignee || payload.assignee}`;
  }
  if (labels[action]) return labels[action];
  if (action === "api_mutation") {
    const route = String(payload.route || ""),
      method = String(payload.method || "");
    if (route.includes("comments"))
      return method === "DELETE"
        ? "Removed a comment"
        : method === "PUT"
          ? "Edited a comment"
          : "Added a comment";
    if (route.includes("checklists")) return "Updated a checklist";
    if (route.includes("time-logs")) return "Updated time tracking";
    if (route.includes("attachments")) return "Changed attachments";
    if (route.endsWith("/move")) return "Moved or reordered this task";
    if (route.startsWith("cards"))
      return method === "DELETE" ? "Archived this task" : "Updated this task";
    return "Updated project settings";
  }
  return labelFor(action);
}
export function auditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value))
    return value.length ? value.map(auditValue).join("; ") : "None";
  if (typeof value === "object") {
    const obj = value as AuditPayload;
    if ("title" in obj)
      return (
        String(obj.title) +
        (obj.completed !== undefined
          ? obj.completed
            ? " · Completed"
            : " · Incomplete"
          : "") +
        (obj.assignee ? " · " + String(obj.assignee) : "") +
        (obj.due_date ? " · Due " + String(obj.due_date) : "")
      );
    if ("name" in obj && "value" in obj)
      return String(obj.name) + ": " + auditValue(obj.value);
    return JSON.stringify(redactAudit(value));
  }
  return value === "no_priority" ? "No priority" : String(value);
}
export function redactAudit(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAudit);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        /password|secret|token|authorization|private.?key/i.test(k)
          ? "[redacted]"
          : redactAudit(v),
      ]),
    );
  return value;
}
