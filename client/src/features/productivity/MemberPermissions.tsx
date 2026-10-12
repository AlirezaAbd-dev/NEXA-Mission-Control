import { useState } from "react";
import { Button, Checkbox, Modal } from "@/components/ui";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
const caps = ["create", "edit", "move", "archive", "comment", "upload"];
export function MemberPermissions({ projectId }: { projectId: string }) {
  const { data } = useProductivity<Record<string, boolean>>(
      `projects/${projectId}/permissions`,
    ),
    save = useProductivityMutation();
  const [modal, setModal] = useState(false),
    [allowed, setAllowed] = useState<string[]>([]);
  return (
    <section className="p-5 border rounded-xl border-slate-200 dark:border-[#183035] space-y-3">
      <h2 className="font-semibold">Project member permissions</h2>
      <p className="text-sm text-slate-500">
        Administrators retain management access. Viewers remain read-only.
        Choose which task actions regular project members may perform.
      </p>
      <p className="text-sm">
        Allowed: {caps.filter((c) => data?.[c]).join(", ") || "None"}
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setAllowed(caps.filter((c) => data?.[c]));
          setModal(true);
        }}
      >
        Configure permissions
      </Button>
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Configure member permissions"
      >
        <div className="space-y-3">
          {caps.map((c) => (
            <Checkbox
              key={c}
              label={`${c[0].toUpperCase() + c.slice(1)} tasks${c === "upload" ? " and attachments" : ""}`}
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
          >
            Save permissions
          </Button>
        </div>
      </Modal>
    </section>
  );
}
