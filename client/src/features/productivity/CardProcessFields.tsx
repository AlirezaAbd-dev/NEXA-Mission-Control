import { useProjectMembers } from "@/hooks/productivity/useProjectMembers";
import { Button, CustomSelect, Input } from "@/components/ui";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
import { useAuthStore } from "@/stores/auth.store";
import type { Card } from "@/types";
import type { ProjectResource } from "@/types/productivity";
export function CardProcessFields({ card }: { card: Card }) {
  const base = `projects/${card.project_id}`,
    { data: types = [] } = useProductivity<ProjectResource[]>(`${base}/types`),
    { data: settings = [] } = useProductivity<ProjectResource[]>(
      `${base}/settings`,
    ),
    { data: rules = [] } = useProductivity<ProjectResource[]>(
      `${base}/workflows`,
    ),
    { data: approvals = [] } = useProductivity<ProjectResource[]>(
      `${base}/approvals`,
    ),
    save = useProductivityMutation(),
    user = useAuthStore((s) => s.user);
  const { data: members = [] } = useProjectMembers(card.project_id);
  const role = members.find((m) => m.user_id === user?.id)?.role || "";
  const current = settings.find((r) => r.card_id === card.id);
  const change = (patch: {
    work_type_id?: string | null;
    repeat_days?: number | null;
    reminder_minutes?: number | null;
  }) =>
    save.mutate({
      path: `${base}/cards/${card.id}/settings`,
      method: "put",
      data: {
        work_type_id: current?.work_type_id || null,
        repeat_days: current?.repeat_days || null,
        reminder_minutes: current?.reminder_minutes ?? null,
        ...patch,
      },
    });
  return (
    <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-[#183035]">
      <h3 className="text-xs uppercase text-slate-500 font-semibold">
        Process & recurring work
      </h3>
      <CustomSelect
        label="Work type"
        value={current?.work_type_id || ""}
        options={[
          { value: "", label: "Task" },
          ...types.map((t) => ({ value: t.id, label: t.name || "Type" })),
        ]}
        onChange={(v) => change({ work_type_id: v || null })}
      />
      <Input
        label="Repeat every N days after completion"
        type="number"
        min={1}
        max={365}
        value={current?.repeat_days || ""}
        onChange={(e) =>
          change({
            repeat_days: e.target.value ? Number(e.target.value) : null,
          })
        }
      />
      <CustomSelect
        label="Due-date reminder"
        value={String(current?.reminder_minutes ?? "")}
        options={[
          { value: "", label: "No reminder" },
          { value: "0", label: "At due date" },
          { value: "60", label: "1 hour before" },
          { value: "1440", label: "1 day before" },
          { value: "10080", label: "1 week before" },
        ]}
        onChange={(v) =>
          change({ reminder_minutes: v === "" ? null : Number(v) })
        }
      />
      {rules
        .filter((r) => r.from_column === card.column_id && r.require_approval)
        .map((r) => {
          const request = approvals.find(
            (a) =>
              a.card_id === card.id &&
              a.transition_id === r.id &&
              a.revision === card.updated_at,
          );
          return (
            <div key={r.id} className="space-y-2">
              <p className="text-sm">
                {r.name}:{" "}
                {request?.approved_by
                  ? "Approved"
                  : request
                    ? "Awaiting approval"
                    : "Approval required"}
              </p>
              {!request && ["owner", "admin", "member"].includes(role) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    save.mutate({
                      path: `${base}/cards/${card.id}/approval`,
                      data: { transition_id: r.id },
                    })
                  }
                >
                  Request approval
                </Button>
              ) : request &&
                !request.approved_by &&
                request.requested_by !== user?.id &&
                ["owner", "admin"].includes(role) ? (
                <Button
                  size="sm"
                  onClick={() =>
                    save.mutate({
                      path: `${base}/approvals/${request.id}/approve`,
                    })
                  }
                >
                  Approve transition
                </Button>
              ) : null}
            </div>
          );
        })}
    </section>
  );
}
