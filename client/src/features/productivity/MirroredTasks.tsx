import { useState, type ReactNode } from "react";
import { Button, Modal, CustomSelect } from "@/components/ui";
import { useProject } from "@/hooks/project/useProject";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
import { useUiStore } from "@/stores/ui.store";
import type { WorkCard } from "@/types/productivity";
interface Mirror {
  id: string;
  card_id: string;
  title: string;
  project_name: string;
  status: string;
  priority: string;
}
export function MirroredTasks({ projectId, actions }: { projectId: string; actions?: ReactNode }) {
  const { data: project } = useProject(projectId),
    { data: mirrors = [] } = useProductivity<Mirror[]>(
      `projects/${projectId}/mirrors`,
    ),
    { data: work = [] } = useProductivity<WorkCard[]>(
      `workspaces/${project?.workspace_id}/work`,
      !!project?.workspace_id,
    ),
    save = useProductivityMutation(),
    open = useUiStore((s) => s.openCardModal);
  const [modal, setModal] = useState(false),
    [source, setSource] = useState("");
  return (
    <section className="min-w-0 space-y-2 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-xs uppercase font-semibold text-slate-500">
            Mirrored tasks
          </h2>
          <Button size="sm" variant="ghost" onClick={() => setModal(true)}>
            Mirror a task
          </Button>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {!!mirrors.length && (
        <div className="flex gap-3 overflow-x-auto">
          {mirrors.map((m) => (
            <Button
              key={m.id}
              variant="outline"
              onClick={() => open(m.card_id)}
            >
              {m.title} · {m.project_name} · {m.status}
            </Button>
          ))}
        </div>
      )}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Mirror a task from another project"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            This displays the same task here. Edits update its source
            everywhere; its workflow stays in the source project. Viewers also
            need access to that project.
          </p>
          <CustomSelect
            searchable
            label="Source task"
            value={source}
            options={work
              .filter((c) => c.project_id !== projectId)
              .map((c) => ({
                value: c.id,
                label: `${c.project_name} · ${c.title}`,
              }))}
            onChange={setSource}
          />
          <Button
            disabled={!source || save.isPending}
            onClick={() =>
              save.mutate(
                {
                  path: `projects/${projectId}/mirrors`,
                  data: { name: "Mirrored task", card_id: source },
                },
                { onSuccess: () => setModal(false) },
              )
            }
          >
            Add mirror
          </Button>
        </div>
      </Modal>
    </section>
  );
}
