import { useState } from "react";
import { Button, Input, Modal, Checkbox, CustomSelect } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useLocalResource } from "@/hooks/localops/useLocalResource";
import { useLocalMutation } from "@/hooks/localops/useLocalMutation";
import { useProjectMembers } from "@/hooks/productivity/useProjectMembers";
import { apiError } from "@/lib/apiError";
import type { Session, Role, Assignment } from "./types";
const capabilities = [
  "create",
  "edit",
  "move",
  "archive",
  "comment",
  "upload",
  "desk_agent",
];
export function RoleManager({ projectId }: { projectId: string }) {
  const { data: session } = useLocalResource<Session>(projectId, "session");
  const { data: roles = [] } = useLocalResource<Role[]>(
    projectId,
    "roles",
    !!session?.can_manage,
  );
  const { data: assignments = [] } = useLocalResource<Assignment[]>(
    projectId,
    "role-members",
    !!session?.can_manage,
  );
  const { data: members = [] } = useProjectMembers(projectId);
  const save = useLocalMutation(projectId);
  const [editing, setEditing] = useState<Role | null | undefined>(),
    [name, setName] = useState(""),
    [permissions, setPermissions] = useState<string[]>([]),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState<Role>();
  if (!session?.can_manage) return null;
  async function submit() {
    try {
      await save.mutateAsync({
        path: "roles",
        data: { id: editing?.id, name, permissions },
      });
      setEditing(undefined);
      setError("");
    } catch (e) {
      setError(apiError(e));
    }
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Custom roles</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setName("");
            setPermissions(["edit", "move", "comment"]);
            setError("");
          }}
        >
          New role
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Named task permissions further restrict the project member policy.
        Administrators retain management access; viewers stay read-only. Desk
        agent grants access to the service queue.
      </p>
      {roles.map((role) => (
        <div
          key={role.id}
          className="flex flex-wrap gap-2 items-center border-b border-border py-2"
        >
          <span className="flex-1">
            {role.name}
            <span className="block text-xs text-muted-foreground">
              {role.permissions.join(", ") || "View only"}
            </span>
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(role);
              setName(role.name);
              setPermissions(role.permissions);
              setError("");
            }}
          >
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(role)}>
            Delete
          </Button>
        </div>
      ))}
      {!roles.length && (
        <p className="text-sm text-muted-foreground">
          Create a role, then assign it to project members below.
        </p>
      )}
      {members
        .filter((m) => !["owner", "admin"].includes(m.role))
        .map((m) => (
          <div
            key={m.user_id}
            className="grid sm:grid-cols-2 items-center gap-3"
          >
            <span>
              {m.display_name} · {m.role}
            </span>
            <CustomSelect
              value={
                assignments.find((a) => a.user_id === m.user_id)?.role_id || ""
              }
              options={[
                { value: "", label: "Use project member policy" },
                ...roles.map((r) => ({ value: r.id, label: r.name })),
              ]}
              onChange={(value) =>
                save.mutate(
                  value
                    ? {
                        path: "role-members",
                        data: { user_id: m.user_id, role_id: value },
                      }
                    : { path: "role-members/" + m.user_id, method: "delete" },
                )
              }
            />
          </div>
        ))}
      <Modal
        isOpen={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title="Custom role"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="space-y-2">
            {capabilities.map((c) => (
              <Checkbox
                key={c}
                label={c.replace("_", " ")}
                checked={permissions.includes(c)}
                onChange={(v) =>
                  setPermissions(
                    v
                      ? [...permissions, c]
                      : permissions.filter((x) => x !== c),
                  )
                }
              />
            ))}
          </div>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <Button
            disabled={!name.trim()}
            isLoading={save.isPending}
            onClick={() => void submit()}
          >
            Save role
          </Button>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(undefined)}
        title="Delete custom role"
        description="Assigned members will return to the project member policy."
        isDestructive
        onConfirm={() => {
          if (deleting)
            save.mutate(
              { path: "roles/" + deleting.id, method: "delete" },
              { onSuccess: () => setDeleting(undefined) },
            );
        }}
      />
    </section>
  );
}
