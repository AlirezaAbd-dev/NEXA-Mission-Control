import { useState } from "react";
import { Button, Input, CustomSelect } from "@/components/ui";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
import { apiError } from "@/lib/apiError";
import type { PlannerSlot, WorkCard } from "@/types/productivity";
export function PlannerPanel({ cards }: { cards: WorkCard[] }) {
  const { data: slots = [] } =
      useProductivity<PlannerSlot[]>("personal/planner"),
    save = useProductivityMutation();
  const [title, setTitle] = useState(""),
    [card, setCard] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [error, setError] = useState("");
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Personal Planner</h2>
      <p className="text-sm text-slate-500">
        Reserve focus time for a task or a personal activity. Times use your
        device timezone.
      </p>
      <div className="grid md:grid-cols-2 gap-3 max-w-3xl">
        <Input
          label="Activity"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <CustomSelect
          searchable
          label="Linked task"
          value={card}
          options={[
            { value: "", label: "Personal activity" },
            ...cards.map((c) => ({
              value: c.id,
              label: `${c.project_name} · ${c.title}`,
            })),
          ]}
          onChange={(v) => {
            setCard(v);
            if (v) setTitle(cards.find((c) => c.id === v)?.title || "");
          }}
        />
        <Input
          type="datetime-local"
          label="Start"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <Input
          type="datetime-local"
          label="End"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <Button
          disabled={!title.trim() || !start || !end || save.isPending}
          onClick={async () => {
            try {
              await save.mutateAsync({
                path: "personal/planner",
                data: {
                  title,
                  card_id: card || null,
                  start_at: new Date(start).toISOString(),
                  end_at: new Date(end).toISOString(),
                },
              });
              setTitle("");
              setError("");
            } catch (e) {
              setError(apiError(e));
            }
          }}
        >
          Reserve focus time
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-rose-500">
          {error}
        </p>
      )}
      {slots.map((s) => (
        <div
          key={s.id}
          className="border-l-4 border-teal-500 bg-teal-500/5 p-4 rounded-r-xl"
        >
          <h3 className="font-semibold">{s.title}</h3>
          <p className="text-sm text-slate-500">
            {new Date(s.start_at).toLocaleString()} →{" "}
            {new Date(s.end_at).toLocaleString()}
          </p>
        </div>
      ))}
    </section>
  );
}
