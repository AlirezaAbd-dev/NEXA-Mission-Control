import {
  auditChanges,
  auditValue,
  labelFor,
  redactAudit,
  type AuditPayload,
} from "./auditPresentation";
export function AuditEventDetails({ payload }: { payload: AuditPayload }) {
  const safe = redactAudit(payload) as AuditPayload;
  const changes = auditChanges(safe),
    other = Object.fromEntries(
      Object.entries(safe).filter(
        ([key]) => !["changes", "task_title"].includes(key),
      ),
    );
  if (
    safe.changes &&
    typeof safe.changes === "object" &&
    "position" in safe.changes
  )
    other.board_order = safe.changes.position;
  const fields = (items: typeof changes) => (
    <dl className="space-y-3 mt-3">
      {items.map((c) => (
        <div
          key={c.field}
          className="rounded-xl border border-border bg-muted/30 p-3"
        >
          <dt className="font-semibold text-foreground text-xs mb-2">
            {labelFor(c.field)}
          </dt>
          <dd className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="min-w-0">
              <span className="text-muted-foreground block mb-1">Previous</span>
              <p className="whitespace-pre-wrap break-words text-secondary-foreground">
                {auditValue(c.field === "archived" ? !!c.before : c.before)}
              </p>
            </div>
            <div className="min-w-0">
              <span className="text-primary block mb-1">New</span>
              <p className="whitespace-pre-wrap break-words text-foreground">
                {auditValue(c.field === "archived" ? !!c.after : c.after)}
              </p>
            </div>
          </dd>
        </div>
      ))}
    </dl>
  );
  return (
    <div>
      {fields(changes.slice(0, 4))}
      {changes.length > 4 && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer font-semibold text-primary">
            Show {changes.length - 4} more changed fields
          </summary>
          {fields(changes.slice(4))}
        </details>
      )}
      {!changes.length &&
        Object.entries(other)
          .filter(([k]) => !["route", "method", "board_order"].includes(k))
          .map(([key, value]) => (
            <p
              key={key}
              className="mt-2 text-xs break-words text-muted-foreground"
            >
              <span className="font-semibold">{labelFor(key)}: </span>
              {auditValue(value)}
            </p>
          ))}
      {Object.keys(other).length > 0 && (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            Event metadata
          </summary>
          <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 mt-2 max-h-48 overflow-auto">
            {JSON.stringify(redactAudit(other), null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
