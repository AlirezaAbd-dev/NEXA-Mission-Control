import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import type { AuditEntry } from "@/types/enterprise";
import { apiError } from "@/lib/apiError";
export function AuditLog({ projectId }: { projectId: string }) {
  const { data: entries = [], error } = useEnterpriseResource<AuditEntry[]>(
    projectId,
    "audit",
  );
  return (
    <section className="p-5 rounded-xl bg-white dark:bg-[#0d1a1d] border border-slate-200 dark:border-[#183035]">
      <h2 className="font-semibold mb-4">Security & activity audit</h2>
      {error && (
        <p role="alert" className="text-sm text-rose-500">
          {apiError(error)}
        </p>
      )}
      <div className="max-h-80 overflow-auto space-y-3">
        {entries.map((e) => (
          <div
            key={e.id}
            className="border-b border-slate-100 dark:border-[#183035] pb-3"
          >
            <p className="text-xs font-medium">
              {e.actor_name || "System"} · {e.action.replaceAll("_", " ")}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(e.created_at).toLocaleString()}
            </p>
            <details className="text-xs text-slate-500">
              <summary>Event details</summary>
              <pre className="whitespace-pre-wrap break-all mt-2">
                {e.payload}
              </pre>
            </details>
          </div>
        ))}
        {entries.length === 0 && !error && (
          <p className="text-sm text-slate-500">
            Project changes will appear here.
          </p>
        )}
      </div>
    </section>
  );
}
