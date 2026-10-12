import { useState } from "react";
import { Button, Modal, Checkbox, CustomSelect } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useLocalResource } from "@/hooks/localops/useLocalResource";
import { useLocalMutation } from "@/hooks/localops/useLocalMutation";
import { useProjectMembers } from "@/hooks/productivity/useProjectMembers";
import { useCards } from "@/hooks/card/useCards";
import { apiError } from "@/lib/apiError";
import type { Session, TaskRule } from "./types";
const capabilities = ["edit", "move", "archive", "comment", "upload"];
export function TaskPermissionManager({ projectId }: { projectId: string }) {
  const { data: session } = useLocalResource<Session>(projectId, "session");
  const { data: rules = [] } = useLocalResource<TaskRule[]>(
    projectId,
    "task-permissions",
    !!session?.can_manage,
  );
  const { data: members = [] } = useProjectMembers(projectId),
    { data: cards = [] } = useCards({ project_id: projectId });
  const save = useLocalMutation(projectId),
    [open, setOpen] = useState(false),
    [card, setCard] = useState(""),
    [member, setMember] = useState(""),
    [permissions, setPermissions] = useState(capabilities),
    [error, setError] = useState(""),
    [reset, setReset] = useState<TaskRule>();
  if (!session?.can_manage) return null;
  async function submit() {
    try {
      await save.mutateAsync({
        path: "task-permissions",
        data: { card_id: card, user_id: member, permissions },
      });
      setOpen(false);
      setError("");
    } catch (e) {
      setError(apiError(e));
    }
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex justify-between gap-2">
        <h2 className="font-bold">Task action permissions</h2>
        <Button
          size="sm"
          onClick={() => {
            setOpen(true);
            setCard("");
            setMember("");
            setPermissions(capabilities);
            setError("");
          }}
        >
          Add rule
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Restrict actions for one member on one task. Rules intersect with their
        role and project policy. This controls editing and collaboration; it
        does not hide the task from project members.
      </p>
      {rules.map((r) => (
        <div
          key={r.card_id + r.user_id}
          className="flex flex-wrap items-center gap-2 border-b border-border py-2"
        >
          <div className="flex-1">
            <p>
              {r.title} ·{" "}
              {members.find((m) => m.user_id === r.user_id)?.display_name ||
                r.user_id}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.permissions.join(", ") || "No task actions"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCard(r.card_id);
              setMember(r.user_id);
              setPermissions(r.permissions);
              setOpen(true);
            }}
          >
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setReset(r)}>
            Reset
          </Button>
        </div>
      ))}
      {!rules.length && (
        <p className="text-sm text-muted-foreground">
          Members currently inherit their project permissions.
        </p>
      )}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Task permissions"
      >
        <div className="space-y-4">
          <CustomSelect
            label="Task"
            value={card}
            onChange={setCard}
            options={cards.map((c) => ({ value: c.id, label: c.title }))}
          />
          <CustomSelect
            label="Member"
            value={member}
            onChange={setMember}
            options={members
              .filter((m) => !["owner", "admin"].includes(m.role))
              .map((m) => ({ value: m.user_id, label: m.display_name }))}
          />
          {capabilities.map((c) => (
            <Checkbox
              key={c}
              label={c}
              checked={permissions.includes(c)}
              onChange={(v) =>
                setPermissions(
                  v ? [...permissions, c] : permissions.filter((x) => x !== c),
                )
              }
            />
          ))}
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <Button
            disabled={!card || !member}
            isLoading={save.isPending}
            onClick={() => void submit()}
          >
            Save permissions
          </Button>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={!!reset}
        onClose={() => setReset(undefined)}
        title="Reset task permissions"
        description="This member will inherit their role and project permissions for the task."
        onConfirm={() => {
          if (reset)
            save.mutate(
              {
                path: "task-permissions/" + reset.card_id + ":" + reset.user_id,
                method: "delete",
              },
              { onSuccess: () => setReset(undefined) },
            );
        }}
      />
    </section>
  );
}
