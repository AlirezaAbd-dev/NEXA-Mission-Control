import { useState } from "react";
import { Archive, Search, Undo2, ExternalLink } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useCards } from "@/hooks/card/useCards";
import { useBulkCards } from "@/hooks/enterprise/useBulkCards";
import { useUiStore } from "@/stores/ui.store";
import { apiError } from "@/lib/apiError";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { PriorityBadge } from "@/components/common/PriorityBadge";

export function ArchiveCenter({
  projectId,
  compact = false,
}: {
  projectId: string;
  compact?: boolean;
}) {
  const { data: cards = [], isLoading } = useCards({
    project_id: projectId,
    archived: true,
  });
  const restore = useBulkCards(projectId);
  const openCardModal = useUiStore((s) => s.openCardModal);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [targetId, setTargetId] = useState<string>();

  const filteredCards = cards.filter((c) =>
    c.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <section
      className={`rounded-xl bg-white dark:bg-[#0d1a1d] border border-slate-200 dark:border-[#183035] ${
        compact ? "p-4 space-y-3" : "p-5 space-y-4"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Archive size={18} className="text-teal-600 dark:text-teal-400" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            Archived tasks
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
            {cards.length}
          </span>
        </div>
      </div>

      {cards.length > 5 && (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            placeholder="Search archived tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 animate-pulse py-4 text-center">
          Loading archived tasks...
        </p>
      ) : cards.length === 0 ? (
        <div className="py-8 text-center text-slate-500 space-y-1">
          <Archive size={28} className="mx-auto text-slate-400/60 mb-2" />
          <p className="text-sm font-medium">No archived tasks</p>
          <p className="text-xs text-slate-400">
            Deleted tasks move here and can be restored at any time.
          </p>
        </div>
      ) : filteredCards.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">
          No tasks matching "{search}"
        </p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filteredCards.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100 dark:border-[#162a2e] bg-slate-50/50 dark:bg-[#091417] hover:border-teal-500/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {c.title}
                  </span>
                  {c.priority && <PriorityBadge priority={c.priority} />}
                </div>
                {c.archived_at && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Archived {new Date(c.archived_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  title="View details"
                  onClick={() => openCardModal(c.id)}
                >
                  <ExternalLink size={13} className="mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
                  onClick={() => setTargetId(c.id)}
                >
                  <Undo2 size={13} className="mr-1" />
                  Restore
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-rose-500">
          {error}
        </p>
      )}

      <ConfirmModal
        isOpen={!!targetId}
        onClose={() => setTargetId(undefined)}
        title="Restore this task?"
        description="The task will return to its original column and become active on your board."
        onConfirm={() =>
          targetId &&
          restore.mutate(
            { card_ids: [targetId], action: "restore" },
            {
              onSuccess: () => setTargetId(undefined),
              onError: (e) => setError(apiError(e)),
            },
          )
        }
      />
    </section>
  );
}

