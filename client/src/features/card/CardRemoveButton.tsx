import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useDeleteCard } from "@/hooks/card/useDeleteCard";
import { apiError } from "@/lib/apiError";
import type { Card } from "@/types";

export function CardRemoveButton({
  card,
  onRemoved,
}: {
  card: Card;
  onRemoved?: () => void;
}) {
  const remove = useDeleteCard(card.project_id);
  const [open, setOpen] = useState(false);
  const close = () => {
    if (!remove.isPending) setOpen(false);
  };
  if (card.archived_at) return null;
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="text-danger h-7 px-2"
        onClick={() => {
          remove.reset();
          setOpen(true);
        }}
      >
        <Trash2 size={13} />
        Remove task
      </Button>
      <Modal isOpen={open} onClose={close} title="Remove this task?" size="sm">
        <div className="space-y-4">
          <p className="text-sm break-words font-semibold">{card.title}</p>
          <p className="text-sm text-muted-foreground">
            This task will be removed from active views and moved to the
            archive. You can restore it from Project settings → Archive &amp;
            restore.
          </p>
          {remove.error && (
            <p role="alert" className="text-sm text-danger">
              {apiError(remove.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={close}
              disabled={remove.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={remove.isPending}
              onClick={() =>
                remove.mutate(card.id, {
                  onSuccess: () => {
                    setOpen(false);
                    onRemoved?.();
                  },
                })
              }
            >
              Remove task
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
