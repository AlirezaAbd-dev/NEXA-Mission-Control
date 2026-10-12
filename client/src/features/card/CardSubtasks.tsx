import { useState } from "react";
import { ListTree, Unlink } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import { useCardMetadata } from "@/hooks/enterprise/useCardMetadata";
import { useCards } from "@/hooks/card/useCards";
import { useCreateCard } from "@/hooks/card/useCreateCard";
import { useUiStore } from "@/stores/ui.store";
import { apiError } from "@/lib/apiError";
import type { Card } from "@/types";
import type { CardMetadata } from "@/types/enterprise";

export function CardSubtasks({ card }: { card: Card }) {
  const { data: metadata = [] } = useEnterpriseResource<CardMetadata[]>(
      card.project_id,
      "metadata",
    ),
    { data: cards = [] } = useCards({ project_id: card.project_id }),
    create = useCreateCard(card.project_id),
    link = useCardMetadata(card.project_id),
    open = useUiStore((s) => s.openCardModal);
  const [title, setTitle] = useState(""),
    [error, setError] = useState("");
  const children = cards.filter(
    (c) => metadata.find((m) => m.id === c.id)?.parent_id === card.id,
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-secondary-foreground uppercase tracking-wider">
          <ListTree className="w-3.5 h-3.5 text-teal-500" />
          <span>Subtasks ({children.length})</span>
        </h3>
      </div>
      <div className="space-y-1.5">
        {children.map((c) => {
          const childMeta = metadata.find((m) => m.id === c.id);
          return (
            <div
              key={c.id}
              className="group flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 transition-all hover:bg-muted/60 dark:border-white/5 dark:bg-black/20 dark:hover:bg-white/5"
            >
              <button
                type="button"
                onClick={() => open(c.id)}
                className="flex-1 truncate text-start text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {c.title}
              </button>
              <Button
                size="sm"
                variant="ghost"
                title="Unlink subtask from this parent task"
                aria-label={`Unlink ${c.title}`}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 opacity-70 group-hover:opacity-100 transition-all shrink-0 cursor-pointer rounded-lg"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await link.mutateAsync({
                      id: c.id,
                      epic_id: childMeta?.epic_id ?? null,
                      release_id: childMeta?.release_id ?? null,
                      sla_due_at: childMeta?.sla_due_at ?? null,
                      parent_id: null,
                    });
                  } catch (err) {
                    setError(apiError(err));
                  }
                }}
              >
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const child = await create.mutateAsync({
              column_id: card.column_id,
              title,
            });
            await link.mutateAsync({
              id: child.id,
              parent_id: card.id,
              epic_id: null,
              release_id: null,
              sla_due_at: null,
            });
            setTitle("");
          } catch (e) {
            setError(apiError(e));
          }
        }}
      >
        <Input
          aria-label="Subtask title"
          placeholder="Add a subtask…"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          type="submit"
          size="md"
          isLoading={create.isPending || link.isPending}
        >
          Add
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-xs text-rose-500">
          {error}
        </p>
      )}
    </section>
  );
}
