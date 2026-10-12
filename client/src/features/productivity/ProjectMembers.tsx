import { useState } from "react";
import { Button, CustomSelect, Modal } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useProject } from "@/hooks/project/useProject";
import { useWorkspaceMembers } from "@/hooks/workspace/useWorkspaceMembers";
import { useProjectMembers } from "@/hooks/productivity/useProjectMembers";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
export function ProjectMembers({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId),
    { data: directory = [] } = useWorkspaceMembers(project?.workspace_id),
    { data: members = [] } = useProjectMembers(projectId),
    save = useProductivityMutation();
  const [modal, setModal] = useState(false),
    [target, setTarget] = useState(""),
    [role, setRole] = useState("member"),
    [remove, setRemove] = useState<string>();
  const workspaceViewer =
    directory.find((m) => m.user_id === target)?.role === "viewer";
  return (
    <section className="border rounded-xl p-5 space-y-3 border-slate-200 dark:border-[#183035]">
      <h2 className="font-semibold">Project members</h2>
      <p className="text-sm text-slate-500">
        Private projects require explicit membership. Workspace administrators
        inherit access. Public projects remain visible to workspace members;
        make a project private to restrict access.
      </p>
      {members.map((m) => (
        <div
          key={m.user_id}
          className="flex justify-between items-center gap-3"
        >
          <span>
            {m.display_name} · {m.role}
            {m.inherited ? " · inherited" : ""}
          </span>
          {!m.inherited && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTarget(m.user_id);
                  setRole(m.role);
                  setModal(true);
                }}
              >
                Change role
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRemove(m.user_id)}
              >
                Remove membership override
              </Button>
            </div>
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setTarget("");
          setRole("member");
          setModal(true);
        }}
      >
        Add project member
      </Button>
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Configure project membership"
      >
        <div className="space-y-4">
          <CustomSelect
            label="Workspace member"
            searchable
            value={target}
            options={directory
              .filter((m) => !["owner", "admin"].includes(m.role))
              .map((m) => ({ value: m.user_id, label: m.display_name }))}
            onChange={(value) => {
              setTarget(value);
              setRole(
                directory.find((m) => m.user_id === value)?.role === "viewer"
                  ? "viewer"
                  : "member",
              );
            }}
          />
          <CustomSelect
            label="Project role"
            value={role}
            options={(workspaceViewer
              ? ["viewer"]
              : ["admin", "member", "viewer"]
            ).map((value) => ({ value, label: value }))}
            onChange={setRole}
          />
          <Button
            disabled={!target || save.isPending}
            onClick={() =>
              save.mutate(
                {
                  path: `projects/${projectId}/members`,
                  data: { user_id: target, allowed_role: role },
                },
                { onSuccess: () => setModal(false) },
              )
            }
          >
            Save membership
          </Button>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={!!remove}
        onClose={() => setRemove(undefined)}
        title="Remove project membership"
        description="Private projects revoke explicit access. In workspace-visible projects, removing an override restores the user’s workspace role. Workspace administrators retain inherited access."
        onConfirm={() =>
          save.mutate(
            {
              path: `projects/${projectId}/members/${remove}`,
              method: "delete",
            },
            { onSuccess: () => setRemove(undefined) },
          )
        }
      />
    </section>
  );
}
