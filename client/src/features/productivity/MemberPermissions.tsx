import { uiLabel } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import { useState } from "react";
import { Button, Checkbox, Modal } from "@/components/ui";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
const caps = ["create", "edit", "move", "archive", "comment", "upload"];
export function MemberPermissions({ projectId }: { projectId: string }) {
  useUiLocale();
  const { data } = useProductivity<Record<string, boolean>>(
      `projects/${projectId}/permissions`,
    ),
    save = useProductivityMutation();
  const [modal, setModal] = useState(false),
    [allowed, setAllowed] = useState<string[]>([]);
  return (
    <section className="p-5 border rounded-xl border-slate-200 dark:border-white/[0.06] space-y-3">
      <h2 className="font-semibold">{tr("Project member permissions")}</h2>
      <p className="text-sm text-slate-500">{tr("Administrators retain management access. Viewers remain read-only. Choose which task actions regular project members may perform.")}</p>
      <p className="text-sm">{tr("Allowed:")}{caps.filter((c) => data?.[c]).join(", ") || tr("None")}
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setAllowed(caps.filter((c) => data?.[c]));
          setModal(true);
        }}
      >{tr("Configure permissions")}</Button>
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={tr("Configure member permissions")}
      >
        <div className="space-y-3">
          {caps.map((c) => (
            <Checkbox
              key={c}
              label={c === "upload" ? tr("Upload tasks and attachments") : tr("Can {value0} tasks", { value0: uiLabel(c) })}
              checked={allowed.includes(c)}
              onChange={(value) =>
                setAllowed((a) =>
                  value ? [...a, c] : a.filter((v) => v !== c),
                )
              }
            />
          ))}
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  path: `projects/${projectId}/permissions`,
                  data: { name: "Member permissions", permissions: allowed },
                },
                { onSuccess: () => setModal(false) },
              )
            }
          >{tr("Save permissions")}</Button>
        </div>
      </Modal>
    </section>
  );
}
