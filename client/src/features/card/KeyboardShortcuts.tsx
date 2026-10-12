import { Checkbox } from "@/components/ui/Checkbox";
import { useProject } from "@/hooks/project/useProject";
import { useProjectMembers } from "@/hooks/productivity/useProjectMembers";
import { useLabels } from "@/hooks/label/useLabels";
import { useSetCardLabels } from "@/hooks/card/useSetCardLabels";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useUiStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCard } from "@/hooks/card/useCard";
import { useBulkCards } from "@/hooks/enterprise/useBulkCards";
import { useSetCardAssignees } from "@/hooks/card/useSetCardAssignees";
export function KeyboardShortcuts() {
  const active = useUiStore((s) => s.activeCardId),
    user = useAuthStore((s) => s.user),
    { data: card } = useCard(active || ""),
    archive = useBulkCards(card?.project_id || ""),
    assign = useSetCardAssignees(card?.project_id || "");
  const { data: project } = useProject(card?.project_id || ""),
    { data: members = [] } = useProjectMembers(card?.project_id),
    { data: labels = [] } = useLabels(project?.workspace_id || ""),
    setLabels = useSetCardLabels(card?.project_id || "");
  const [controls, setControls] = useState<"assignees" | "labels" | null>(null);
  const [help, setHelp] = useState(false),
    [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'input,textarea,[contenteditable="true"],[role="combobox"]',
        )
      )
        return;
      if (e.key === "?") {
        e.preventDefault();
        setHelp(true);
        return;
      }
      if (!card) return;
      if (e.key === "c") {
        e.preventDefault();
        setConfirm(true);
      }
      if (e.key === " " && user) {
        e.preventDefault();
        const ids = card.assignees.map((a) => a.user_id);
        assign.mutate({
          cardId: card.id,
          userIds: ids.includes(user.id)
            ? ids.filter((id) => id !== user.id)
            : [...ids, user.id],
        });
      }
      if (e.key === "m" || e.key === "l") {
        e.preventDefault();
        setControls(e.key === "m" ? "assignees" : "labels");
      }
      if (e.key === "d") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          '[data-shortcut="due"] input',
        );
        input?.focus();
        try {
          input?.showPicker();
        } catch {
          /* Focus remains available when the browser cannot open its picker. */
        }
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [card, user, assign]);
  return (
    <>
      <Modal
        isOpen={!!controls}
        onClose={() => setControls(null)}
        title={controls === "assignees" ? "Task assignees" : "Task labels"}
      >
        <div className="space-y-3">
          {controls === "assignees"
            ? members.map((m) => (
                <div key={m.user_id}>
                  <Checkbox
                    label={m.display_name}
                    checked={
                      !!card?.assignees.some((a) => a.user_id === m.user_id)
                    }
                    onChange={(checked) =>
                      card &&
                      assign.mutate({
                        cardId: card.id,
                        userIds: checked
                          ? [...card.assignees.map((a) => a.user_id), m.user_id]
                          : card.assignees
                              .filter((a) => a.user_id !== m.user_id)
                              .map((a) => a.user_id),
                      })
                    }
                  />
                </div>
              ))
            : labels.map((l) => (
                <div key={l.id}>
                  <Checkbox
                    label={l.name}
                    checked={!!card?.labels.some((a) => a.id === l.id)}
                    onChange={(checked) =>
                      card &&
                      setLabels.mutate({
                        cardId: card.id,
                        labelIds: checked
                          ? [...card.labels.map((a) => a.id), l.id]
                          : card.labels
                              .filter((a) => a.id !== l.id)
                              .map((a) => a.id),
                      })
                    }
                  />
                </div>
              ))}
        </div>
      </Modal>
      <Modal
        isOpen={help}
        onClose={() => setHelp(false)}
        title="Keyboard shortcuts"
      >
        <dl className="space-y-3 text-sm">
          {[
            ["⌘ / Ctrl + K", "Search and command palette"],
            ["c", "Archive the open task"],
            ["m", "Open assignee selector"],
            ["l", "Open labels selector"],
            ["d", "Focus due date"],
            ["Space", "Assign or unassign yourself"],
            ["?", "Show shortcuts"],
          ].map(([key, label]) => (
            <div key={key} className="flex justify-between gap-6">
              <dt className="font-mono text-teal-500">{key}</dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
      </Modal>
      <ConfirmModal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        title="Archive this task?"
        description="You can restore it from the archive center."
        onConfirm={() =>
          card &&
          archive.mutate(
            { card_ids: [card.id], action: "archive" },
            {
              onSuccess: () => {
                setConfirm(false);
                useUiStore.getState().closeCardModal();
              },
            },
          )
        }
      />
    </>
  );
}
