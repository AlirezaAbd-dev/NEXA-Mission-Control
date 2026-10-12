import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/common/ConfirmModal";

interface Props {
  title: string;
  kind: "checklist" | "item";
  maxLength: number;
  onSave: (title: string) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}
export const ChecklistActions = ({
  title,
  kind,
  maxLength,
  onSave,
  onDelete,
}: Props) => {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const open = (next: "edit" | "delete") => {
    setDraft(title);
    setError("");
    setMode(next);
  };
  const close = () => {
    if (!pending) setMode(null);
  };
  const submit = async (action: () => Promise<unknown>) => {
    setPending(true);
    setError("");
    try {
      await action();
      setMode(null);
    } catch {
      setError(
        "Could not save this change. Check your permissions and connection, then try again.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={"Edit " + kind + ": " + title}
          title={"Edit " + kind}
          onClick={() => open("edit")}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-danger"
          aria-label={"Delete " + kind + ": " + title}
          title={"Delete " + kind}
          onClick={() => open("delete")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Modal
        isOpen={mode === "edit"}
        onClose={close}
        title={"Edit " + kind}
        size="sm"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) void submit(() => onSave(draft.trim()));
          }}
        >
          <Input
            label={kind === "checklist" ? "Checklist title" : "Item title"}
            value={draft}
            maxLength={maxLength}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={close}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={pending}
              disabled={!draft.trim()}
            >
              Save changes
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={mode === "delete"}
        onClose={close}
        onConfirm={() => void submit(onDelete)}
        title={"Delete " + kind + "?"}
        description={
          "Delete “" +
          title +
          "”? " +
          (kind === "checklist"
            ? "All items in this checklist will also be removed. "
            : "") +
          "This cannot be undone." +
          (error ? " " + error : "")
        }
        confirmLabel={"Delete " + kind}
        isDestructive
        isLoading={pending}
      />
    </>
  );
};
