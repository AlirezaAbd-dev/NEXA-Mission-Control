import { AutomationSequence, type ActionStep } from "./AutomationSequence";
import { useState } from "react";
import { useParams } from "react-router";
import { Button, Input, CustomSelect, Modal } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { ViewTabs } from "@/features/views/ViewTabs";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import { useSaveResource } from "@/hooks/enterprise/useSaveResource";
import { useRemoveResource } from "@/hooks/enterprise/useRemoveResource";
import { useRunMacro } from "@/hooks/enterprise/useRunMacro";
import { useBoard } from "@/hooks/board/useBoard";
import { useProject } from "@/hooks/project/useProject";
import { useProjectMembers } from "@/hooks/productivity/useProjectMembers";
import { useLabels } from "@/hooks/label/useLabels";
import { apiError } from "@/lib/apiError";
import type { EnterpriseResource, ResourceInput } from "@/types/enterprise";
const triggers = [
  "card_created",
  "card_moved",
  "checklist_completed",
  "due_date_reached",
  "done_older_than",
  "sla_breached",
  "sla_response_breached",
  "manual_card",
  "manual_board",
];
const actions = [
  "set_priority",
  "add_label",
  "assign_user",
  "mark_checklist_done",
  "archive_card",
  "move_card",
];
export function AutomationPage() {
  const { projectId = "" } = useParams(),
    { data: rules = [] } = useEnterpriseResource(projectId, "rules"),
    save = useSaveResource(projectId, "rules"),
    remove = useRemoveResource(projectId, "rules"),
    run = useRunMacro(projectId),
    { data: board } = useBoard(projectId),
    { data: project } = useProject(projectId),
    { data: members = [] } = useProjectMembers(projectId),
    { data: labels = [] } = useLabels(project?.workspace_id || "");
  const [modal, setModal] = useState(false),
    [editing, setEditing] = useState<string>(),
    [form, setForm] = useState<ResourceInput>({
      name: "",
      trigger_type: "card_moved",
      action_type: "set_priority",
      action_config: { value: "high" },
      trigger_config: {},
    }),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState<string>(),
    [runId, setRunId] = useState<string>();
  const edit = (r?: EnterpriseResource) => {
    setEditing(r?.id);
    setForm(
      r
        ? {
            name: r.name,
            trigger_type: r.trigger_type,
            action_type: r.action_type,
            is_active: !!r.is_active,
            trigger_config: JSON.parse(r.trigger_config_json || "{}") as Record<
              string,
              unknown
            >,
            action_config: JSON.parse(r.action_config_json || "{}") as Record<
              string,
              unknown
            >,
          }
        : {
            name: "",
            trigger_type: "card_moved",
            action_type: "set_priority",
            trigger_config: {},
            action_config: { value: "high" },
            is_active: true,
          },
    );
    setError("");
    setModal(true);
  };
  const targets =
    form.action_type === "set_priority"
      ? ["urgent", "high", "medium", "low", "no_priority"].map((value) => ({
          value,
          label: value,
        }))
      : form.action_type === "assign_user"
        ? members.map((m) => ({ value: m.user_id, label: m.display_name }))
        : form.action_type === "add_label"
          ? labels.map((l) => ({ value: l.id, label: l.name }))
          : board?.columns.map((c) => ({ value: c.id, label: c.name })) || [];
  return (
    <div className="p-4 md:p-6 space-y-5">
      <ViewTabs projectId={projectId} />
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automation studio</h1>
          <p className="text-sm text-slate-500">
            Event rules, scheduled routines, and reusable macros.
          </p>
        </div>
        <Button onClick={() => edit()}>Create rule</Button>
      </div>
      {error && (
        <p role="alert" className="text-rose-500">
          {error}
        </p>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {rules.map((r) => (
          <section
            key={r.id}
            className="p-5 rounded-xl bg-white dark:bg-[#0d1a1d] border border-slate-200 dark:border-[#183035] space-y-3"
          >
            <div className="flex justify-between">
              <h2 className="font-semibold">{r.name}</h2>
              <span className="text-xs text-teal-600 dark:text-teal-400">
                {r.is_active ? "Active" : "Paused"}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              When {r.trigger_type?.replaceAll("_", " ")} →{" "}
              {r.action_type?.replaceAll("_", " ")}
            </p>
            <p className="text-xs text-slate-500">
              {r.runs || 0} successful runs
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => edit(r)}>
                Edit
              </Button>
              {r.trigger_type === "manual_board" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRunId(r.id)}
                  isLoading={run.isPending}
                >
                  Run on board
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleting(r.id)}
              >
                Remove
              </Button>
            </div>
          </section>
        ))}
      </div>
      {rules.length === 0 && (
        <div className="p-12 text-center border border-dashed rounded-xl border-slate-300 dark:border-[#183035]">
          <h2 className="font-semibold">Let your board do the routine work</h2>
          <p className="text-sm text-slate-500 mt-2">
            Create a rule to assign tasks, change priority, add labels, or
            archive completed work.
          </p>
        </div>
      )}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit automation" : "Create automation"}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(
              { ...form, id: editing },
              {
                onSuccess: () => setModal(false),
                onError: (e) => setError(apiError(e)),
              },
            );
          }}
        >
          <Input
            required
            label="Rule name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <CustomSelect
            label="Trigger"
            value={form.trigger_type}
            options={triggers.map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            }))}
            onChange={(trigger_type) =>
              setForm((f) => ({ ...f, trigger_type }))
            }
          />
          {form.trigger_type === "card_moved" && (
            <CustomSelect
              label="Destination column (optional)"
              value={String(form.trigger_config?.column_id || "")}
              options={[
                { value: "", label: "Any column" },
                ...(board?.columns.map((c) => ({
                  value: c.id,
                  label: c.name,
                })) || []),
              ]}
              onChange={(column_id) =>
                setForm((f) => ({
                  ...f,
                  trigger_config: {
                    ...f.trigger_config,
                    column_id: column_id || undefined,
                  },
                }))
              }
            />
          )}{" "}
          {form.trigger_type === "done_older_than" && (
            <Input
              label="Days in Done"
              type="number"
              min="1"
              max="3650"
              value={Number(form.trigger_config?.days || 14)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  trigger_config: {
                    ...f.trigger_config,
                    days: Number(e.target.value),
                  },
                }))
              }
            />
          )}
          <CustomSelect
            label="Action"
            value={form.action_type}
            options={actions.map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            }))}
            onChange={(action_type) =>
              setForm((f) => ({
                ...f,
                action_type,
                action_config: { steps: f.action_config?.steps },
              }))
            }
          />
          {!["archive_card", "mark_checklist_done"].includes(
            form.action_type || "",
          ) && (
            <CustomSelect
              label="Action target"
              value={String(form.action_config?.value || "")}
              options={targets}
              onChange={(value) =>
                setForm((f) => ({
                  ...f,
                  action_config: { ...f.action_config, value },
                }))
              }
            />
          )}
          <CustomSelect
            label="Only when priority matches"
            value={String(form.trigger_config?.priority || "")}
            options={[
              { value: "", label: "Any priority" },
              ...["urgent", "high", "medium", "low", "no_priority"].map(
                (value) => ({ value, label: value }),
              ),
            ]}
            onChange={(priority) =>
              setForm((f) => ({
                ...f,
                trigger_config: {
                  ...f.trigger_config,
                  priority: priority || undefined,
                },
              }))
            }
          />
          <CustomSelect
            label="Only when assigned to"
            value={String(form.trigger_config?.assignee_id || "")}
            options={[
              { value: "", label: "Anyone" },
              ...members.map((m) => ({
                value: m.user_id,
                label: m.display_name,
              })),
            ]}
            onChange={(assignee_id) =>
              setForm((f) => ({
                ...f,
                trigger_config: {
                  ...f.trigger_config,
                  assignee_id: assignee_id || undefined,
                },
              }))
            }
          />
          <CustomSelect
            label="Only when label matches"
            value={String(form.trigger_config?.label_id || "")}
            options={[
              { value: "", label: "Any label" },
              ...labels.map((l) => ({ value: l.id, label: l.name })),
            ]}
            onChange={(label_id) =>
              setForm((f) => ({
                ...f,
                trigger_config: {
                  ...f.trigger_config,
                  label_id: label_id || undefined,
                },
              }))
            }
          />
          <AutomationSequence
            steps={(form.action_config?.steps || []) as ActionStep[]}
            onChange={(steps) =>
              setForm((f) => ({
                ...f,
                action_config: { ...f.action_config, steps },
              }))
            }
            targets={(kind) =>
              kind === "set_priority"
                ? ["urgent", "high", "medium", "low", "no_priority"].map(
                    (value) => ({ value, label: value }),
                  )
                : kind === "assign_user"
                  ? members.map((m) => ({
                      value: m.user_id,
                      label: m.display_name,
                    }))
                  : kind === "add_label"
                    ? labels.map((l) => ({ value: l.id, label: l.name }))
                    : (board?.columns || []).map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))
            }
          />
          <CustomSelect
            label="State"
            value={form.is_active ? "active" : "paused"}
            options={[
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
            ]}
            onChange={(v) =>
              setForm((f) => ({ ...f, is_active: v === "active" }))
            }
          />
          {error && (
            <p role="alert" className="text-sm text-rose-500">
              {error}
            </p>
          )}
          <Button type="submit" isLoading={save.isPending}>
            Save rule
          </Button>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={!!runId}
        onClose={() => setRunId(undefined)}
        title="Run this macro on the board?"
        description="The configured action will apply to all active tasks in this project."
        onConfirm={() =>
          runId &&
          run.mutate(
            { id: runId },
            {
              onSuccess: () => setRunId(undefined),
              onError: (e) => setError(apiError(e)),
            },
          )
        }
        isLoading={run.isPending}
      />
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(undefined)}
        title="Remove automation?"
        description="The rule and its run history will be removed."
        isDestructive
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting, {
            onSuccess: () => setDeleting(undefined),
            onError: (e) => setError(apiError(e)),
          })
        }
      />
    </div>
  );
}
