import { formatNumber, tr, useUiLocale } from "@/i18n";
import { useState } from "react";
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
export function MirroredTasks({ projectId, isOpen, onOpen, onClose }: { projectId: string; isOpen: boolean; onOpen: () => void; onClose: () => void }) {
  useUiLocale();
  const { data: project } = useProject(projectId),
    { data: mirrors = [] } = useProductivity<Mirror[]>(
      `projects/${projectId}/mirrors`,
    ),
    { data: work = [] } = useProductivity<WorkCard[]>(
      `workspaces/${project?.workspace_id}/work`,
      isOpen && !!project?.workspace_id,
    ),
    save = useProductivityMutation(),
    open = useUiStore((s) => s.openCardModal);
  const [source, setSource] = useState("");
  return (
    <>
      {!!mirrors.length && <Button type="button" size="sm" variant="ghost" onClick={onOpen}>{tr("Mirrored tasks")} · {formatNumber(mirrors.length)}</Button>}
      <Modal isOpen={isOpen} onClose={onClose} title={tr("Mirrored tasks")}>
        <div className="space-y-4">
          {!!mirrors.length && <ul className="space-y-1">
            {mirrors.map(mirror => <li key={mirror.id}>
              <Button type="button" variant="outline" className="h-auto min-h-11 w-full justify-start py-2 text-start"
                onClick={() => { onClose(); open(mirror.card_id); }}>
                <span className="min-w-0 break-words" dir="auto">{mirror.title} · {mirror.project_name} · {mirror.status}</span>
              </Button>
            </li>)}
          </ul>}
          <p className="text-sm text-slate-500">{tr("This displays the same task here. Edits update its source everywhere; its workflow stays in the source project. Viewers also need access to that project.")}</p>
          <CustomSelect
            searchable
            label={tr("Source task")}
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
                { onSuccess: () => { setSource(""); onClose(); } },
              )
            }
          >{tr("Add mirror")}</Button>
        </div>
      </Modal>
    </>
  );
}
