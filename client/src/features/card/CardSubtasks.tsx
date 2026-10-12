import { useState } from "react";
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
      <h3 className="text-sm font-semibold">Subtasks · {children.length}</h3>
      {children.map((c) => (
        <Button
          key={c.id}
          size="sm"
          variant="ghost"
          className="w-full justify-start"
          onClick={() => open(c.id)}
        >
          {c.title}
        </Button>
      ))}
      <form
        className="flex gap-2"
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
          size="sm"
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
