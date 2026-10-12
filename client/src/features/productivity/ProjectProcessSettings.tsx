import { useState } from "react";
import { Button, Input, CustomSelect, Checkbox, Modal } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
import { useBoard } from "@/hooks/board/useBoard";
import { apiError } from "@/lib/apiError";
import type { ProjectResource, ProductivityInput } from "@/types/productivity";
export function ProjectProcessSettings({ projectId }: { projectId: string }) {
  const base = `projects/${projectId}`,
    { data: types = [] } = useProductivity<ProjectResource[]>(`${base}/types`),
    { data: rules = [] } = useProductivity<ProjectResource[]>(
      `${base}/workflows`,
    ),
    { data: forms = [] } = useProductivity<ProjectResource[]>(`${base}/forms`),
    save = useProductivityMutation(),
    { data: board } = useBoard(projectId);
  const [kind, setKind] = useState(""),
    [form, setForm] = useState<ProductivityInput>({}),
    [error, setError] = useState(""),
    [share, setShare] = useState(""),
    [remove, setRemove] = useState<{ kind: string; id: string }>();
  const cols = (board?.columns || []).map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const update = (patch: ProductivityInput) =>
    setForm((f) => ({ ...f, ...patch }));
  return (
    <section className="space-y-4 rounded-xl border p-5 border-slate-200 dark:border-[#183035]">
      <h2 className="font-semibold text-lg">
        Work types, workflows & request forms
      </h2>
      <p className="text-sm text-slate-500">
        Once workflow transitions exist, only explicitly configured routes
        between columns are allowed. Approvals require a different administrator
        and apply to the current task revision.
      </p>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          ["types", "Work types", types],
          ["workflows", "Workflow transitions", rules],
          ["forms", "Request forms", forms],
        ].map(([key, label, rows]) => (
          <div key={String(key)}>
            <h3 className="font-semibold mb-2">{String(label)}</h3>
            {(rows as ProjectResource[]).map((r) => (
              <div className="flex gap-2 justify-between py-2" key={r.id}>
                <span>
                  {r.name}
                  {key === "workflows" && (
                    <span className="block text-xs text-slate-500">
                      {board?.columns.find((c) => c.id === r.from_column)?.name}{" "}
                      → {board?.columns.find((c) => c.id === r.to_column)?.name}
                    </span>
                  )}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRemove({ kind: String(key), id: r.id })}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setKind(String(key));
                setForm({ name: "", allowed_role: "member" });
                setError("");
              }}
            >
              Add {String(label).toLowerCase()}
            </Button>
          </div>
        ))}
      </div>
      {share && (
        <div className="p-3 rounded-xl bg-teal-500/10">
          <p className="text-sm">
            Copy this form link now. Anyone with the link can submit a request.
          </p>
          <Input readOnly value={share} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-rose-500">
          {error}
        </p>
      )}
      <Modal
        isOpen={!!kind}
        onClose={() => setKind("")}
        title={`Create ${kind}`}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name || ""}
            onChange={(e) => update({ name: e.target.value })}
          />
          {kind === "workflows" && (
            <>
              <CustomSelect
                label="From column"
                value={form.from_column || ""}
                options={cols}
                onChange={(v) => update({ from_column: v })}
              />
              <CustomSelect
                label="To column"
                value={form.to_column || ""}
                options={cols}
                onChange={(v) => update({ to_column: v })}
              />
              <Checkbox
                label="Require description"
                checked={!!form.require_description}
                onChange={(e) => update({ require_description: e })}
              />
              <Checkbox
                label="Require completed checklists"
                checked={!!form.require_checklists}
                onChange={(e) => update({ require_checklists: e })}
              />
              <Checkbox
                label="Require administrator approval"
                checked={!!form.require_approval}
                onChange={(e) => update({ require_approval: e })}
              />
              <CustomSelect
                label="Who can transition"
                value={form.allowed_role || "member"}
                options={[
                  { value: "member", label: "Project members" },
                  { value: "admin", label: "Administrators only" },
                ]}
                onChange={(v) => update({ allowed_role: v })}
              />
            </>
          )}
          {kind === "forms" && (
            <>
              <CustomSelect
                label="New request column"
                value={form.column_id || ""}
                options={cols}
                onChange={(v) => update({ column_id: v })}
              />
              <Checkbox
                label="Require description"
                checked={!!form.require_description}
                onChange={(e) => update({ require_description: e })}
              />
            </>
          )}
          {error && (
            <p role="alert" className="text-rose-500">
              {error}
            </p>
          )}
          <Button
            disabled={save.isPending || !form.name?.trim()}
            onClick={async () => {
              try {
                const r = await save.mutateAsync({
                  path: `${base}/${kind}`,
                  data: form,
                });
                if (r.token) setShare(`${location.origin}/intake/${r.token}`);
                setKind("");
                setError("");
              } catch (e) {
                setError(apiError(e));
              }
            }}
          >
            Create
          </Button>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={!!remove}
        onClose={() => setRemove(undefined)}
        title="Remove configuration"
        description="Removing a transition also removes its approvals. Removing a form disables its public link."
        onConfirm={() => {
          if (remove)
            save.mutate(
              { path: `${base}/${remove.kind}/${remove.id}`, method: "delete" },
              { onSuccess: () => setRemove(undefined) },
            );
        }}
      />
    </section>
  );
}
