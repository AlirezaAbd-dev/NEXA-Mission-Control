import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
import type { ProjectResource } from "@/types/productivity";
export function BoardTemplates({ projectId }: { projectId: string }) {
  const base = `projects/${projectId}`,
    { data: templates = [] } = useProductivity<ProjectResource[]>(
      `${base}/templates`,
    ),
    save = useProductivityMutation();
  const [name, setName] = useState(""),
    [apply, setApply] = useState<string>();
  return (
    <section className="space-y-3 border rounded-xl p-5 border-slate-200 dark:border-[#183035]">
      <h2 className="font-semibold">Workspace board templates</h2>
      <p className="text-sm text-slate-500">
        Snapshot task titles, descriptions, estimates and list names. Applying
        adds fresh tasks; comments, assignments, files and dates are not copied.
      </p>
      <div className="flex gap-3">
        <Input
          placeholder="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          disabled={!name.trim() || save.isPending}
          onClick={() =>
            save.mutate(
              { path: `${base}/templates`, data: { name } },
              { onSuccess: () => setName("") },
            )
          }
        >
          Save current board
        </Button>
      </div>
      {templates.map((t) => (
        <div key={t.id} className="flex justify-between gap-3">
          <span>{t.name}</span>
          <Button size="sm" variant="outline" onClick={() => setApply(t.id)}>
            Apply template
          </Button>
        </div>
      ))}
      <ConfirmModal
        isOpen={!!apply}
        onClose={() => setApply(undefined)}
        title="Apply board template"
        description="This adds template tasks to this project. Existing tasks stay in place."
        onConfirm={() =>
          save.mutate(
            { path: `${base}/templates/${apply}/apply` },
            { onSuccess: () => setApply(undefined) },
          )
        }
      />
    </section>
  );
}
