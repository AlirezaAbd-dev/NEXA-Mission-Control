import { dateLocale } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import { AuditEventDetails } from "@/components/common/AuditEventDetails";
import {
  auditPayload,
  auditSummary,
} from "@/components/common/auditPresentation";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import type { AuditEntry } from "@/types/enterprise";
import { apiError } from "@/lib/apiError";
export function AuditLog({ projectId }: { projectId: string }) {
  useUiLocale();
  const { data: entries = [], error } = useEnterpriseResource<AuditEntry[]>(
    projectId,
    "audit",
  );
  return (
    <section className="p-5 rounded-2xl bg-[var(--nexa-surface-l1)] border border-[var(--nexa-divider)]">
      <h2 className="font-semibold mb-4">{tr("Security & activity audit")}</h2>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {apiError(error)}
        </p>
      )}
      <div className="max-h-80 overflow-auto space-y-3">
        {entries.map((e) => (
          <div
            key={e.id}
            className="border-b border-[var(--nexa-divider)] pb-3"
          >
            <p className="text-xs font-medium">
              {e.actor_name || tr("System")} ·{" "}
              {auditSummary(e.action, auditPayload(e.payload))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(e.created_at).toLocaleString(dateLocale())}
            </p>
            {!!auditPayload(e.payload).task_title && (
              <p className="mt-1 text-xs font-semibold text-primary">
                {String(auditPayload(e.payload).task_title)}
              </p>
            )}
            <AuditEventDetails payload={auditPayload(e.payload)} />
          </div>
        ))}
        {entries.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">{tr("Project changes will appear here.")}</p>
        )}
      </div>
    </section>
  );
}
