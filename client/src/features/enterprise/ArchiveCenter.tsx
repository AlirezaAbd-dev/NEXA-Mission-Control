import { useState } from "react";
import { Button } from "@/components/ui";
import { useCards } from "@/hooks/card/useCards";
import { useBulkCards } from "@/hooks/enterprise/useBulkCards";
import { apiError } from "@/lib/apiError";
import { ConfirmModal } from "@/components/common/ConfirmModal";
export function ArchiveCenter({ projectId }: { projectId: string }) {
  const { data: cards = [] } = useCards({
      project_id: projectId,
      archived: true,
    }),
    restore = useBulkCards(projectId);
  const [error, setError] = useState(""),
    [id, setId] = useState<string>();
  return (
    <section className="p-5 rounded-xl bg-white dark:bg-[#0d1a1d] border border-slate-200 dark:border-[#183035] space-y-4">
      <h2 className="font-semibold">Archive & restore</h2>
      {cards.length === 0 ? (
        <p className="text-sm text-slate-500">No archived tasks.</p>
      ) : (
        cards.map((c) => (
          <div key={c.id} className="flex justify-between items-center gap-3">
            <span className="text-sm">{c.title}</span>
            <Button size="sm" variant="outline" onClick={() => setId(c.id)}>
              Restore
            </Button>
          </div>
        ))
      )}
      {error && (
        <p role="alert" className="text-rose-500">
          {error}
        </p>
      )}
      <ConfirmModal
        isOpen={!!id}
        onClose={() => setId(undefined)}
        title="Restore this task?"
        description="The task will return to its original column."
        onConfirm={() =>
          id &&
          restore.mutate(
            { card_ids: [id], action: "restore" },
            {
              onSuccess: () => setId(undefined),
              onError: (e) => setError(apiError(e)),
            },
          )
        }
      />
    </section>
  );
}
