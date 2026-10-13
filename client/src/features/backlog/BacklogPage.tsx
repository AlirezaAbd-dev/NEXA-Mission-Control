import { useState } from "react";
import { useParams } from "react-router";
import { Button, Input, Textarea, CustomSelect, Modal } from "@/components/ui";
import { useSprints } from "@/hooks/sprint/useSprints";
import { useCreateSprint } from "@/hooks/sprint/useCreateSprint";
import { useToggleSprintCard } from "@/hooks/sprint/useToggleSprintCard";
import { useSprintTransition } from "@/hooks/enterprise/useSprintTransition";
import { useCards } from "@/hooks/card/useCards";
import { useBoard } from "@/hooks/board/useBoard";
import { useUiStore } from "@/stores/ui.store";
import { ViewTabs } from "@/features/views/ViewTabs";
import { ResourceSection } from "@/features/enterprise/ResourceSection";
import { dateKey, addDays } from "@/features/views/boardDates";
import { apiError } from "@/lib/apiError";
import type { Sprint, Card } from "@/types";
export function BacklogPage() {
  const { projectId = "" } = useParams(),
    { data: sprints = [] } = useSprints(projectId),
    { data: cards = [] } = useCards({ project_id: projectId }),
    { data: board } = useBoard(projectId),
    create = useCreateSprint(projectId),
    toggle = useToggleSprintCard(projectId),
    transition = useSprintTransition(projectId),
    open = useUiStore((s) => s.openCardModal);
  const [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [goal, setGoal] = useState(""),
    [selected, setSelected] = useState<Sprint | null>(null),
    [start, setStart] = useState(() => dateKey(new Date())),
    [weeks, setWeeks] = useState("2"),
    [carry, setCarry] = useState(""),
    [error, setError] = useState("");
  const completed = (c: Card) =>
    board?.columns.find((col) => col.id === c.column_id)?.type_ === "done";
  const assigned = new Set(
    sprints.filter((s) => s.status !== "completed").flatMap((s) => s.card_ids),
  );
  const active = sprints.find((s) => s.status === "active");
  const groups = [
    ...sprints
      .filter((s) => s.status !== "completed")
      .map((s) => ({
        id: s.id,
        name: s.name,
        sprint: s,
        cards: cards.filter((c) => s.card_ids.includes(c.id)),
      })),
    {
      id: "backlog",
      name: "Product backlog",
      sprint: null,
      cards: cards.filter((c) => !assigned.has(c.id)),
    },
  ];
  return (
    <div className="p-4 md:p-6 space-y-5 min-h-full flex-1 flex flex-col">
      <ViewTabs projectId={projectId} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Backlog & sprints</h1>
          <p className="text-sm text-slate-500">
            Plan the next iteration and track delivery.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreating(true);
            setError("");
          }}
        >
          Create sprint
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-rose-500">
          {error}
        </p>
      )}
      {active && (
        <section className="p-5 rounded-xl border border-teal-500/30 bg-teal-500/10">
          <h2 className="font-bold">{active.name} · Active sprint</h2>
          <p className="text-sm text-slate-500 mt-1">
            {active.goal} · Ends{" "}
            {active.end_date?.slice(0, 10) || "unscheduled"}
          </p>
          <progress
            aria-label="Sprint progress"
            className="w-full h-2 mt-3 accent-teal-500"
            max={Math.max(1, active.card_ids.length)}
            value={
              cards.filter(
                (c) => active.card_ids.includes(c.id) && completed(c),
              ).length
            }
          />
        </section>
      )}
      {groups.map((group) => {
        const points = group.cards.reduce(
            (n, c) => n + (c.story_points || 0),
            0,
          ),
          done = group.cards
            .filter(completed)
            .reduce((n, c) => n + (c.story_points || 0), 0);
        return (
          <section
            key={group.id}
            className="rounded-xl border border-slate-200 dark:border-[#183035] bg-white dark:bg-[#0d1a1d] overflow-visible"
          >
            <div className="p-4 flex flex-wrap justify-between gap-3 bg-slate-50 dark:bg-[#132428] rounded-t-xl">
              <div>
                <h2 className="font-semibold">{group.name}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {group.cards.length} tasks · {points} story points · {done}{" "}
                  points completed
                </p>
              </div>
              {group.sprint && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={group.sprint.status === "planned" && !!active}
                  onClick={() => {
                    setSelected(group.sprint);
                    setStart(dateKey(new Date()));
                    setGoal(group.sprint?.goal || "");
                    setCarry("");
                    setError("");
                  }}
                >
                  {group.sprint.status === "active"
                    ? "Complete sprint"
                    : "Start sprint"}
                </Button>
              )}
            </div>
            {group.cards.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                No tasks yet. Move a task here from the backlog.
              </p>
            ) : (
              group.cards.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 border-t border-slate-100 dark:border-[#183035] hover:bg-slate-50/50 dark:hover:bg-[#132428]/40 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => open(c.id)}
                    className="flex-1 min-w-0 text-left font-medium text-xs sm:text-sm text-slate-800 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 break-words line-clamp-2 transition-colors cursor-pointer py-1"
                    title={c.title}
                  >
                    {c.title}
                  </button>
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                    <span className="text-xs text-slate-500 font-mono">
                      {c.story_points || 0} pts · {c.priority}
                    </span>
                    <CustomSelect
                      className="w-40 sm:w-44"
                      size="sm"
                      value={group.id}
                      options={[
                        { value: "backlog", label: "Product backlog" },
                        ...sprints
                          .filter((s) => s.status !== "completed")
                          .map((s) => ({ value: s.id, label: s.name })),
                      ]}
                      onChange={async (target) => {
                        try {
                          if (group.sprint)
                            await toggle.mutateAsync({
                              sprintId: group.id,
                              cardId: c.id,
                              add: false,
                            });
                          if (target !== "backlog")
                            await toggle.mutateAsync({
                              sprintId: target,
                              cardId: c.id,
                              add: true,
                            });
                        } catch (e) {
                          setError(apiError(e));
                        }
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </section>
        );
      })}
      <div className="grid lg:grid-cols-2 gap-5">
        <ResourceSection
          projectId={projectId}
          resource="epics"
          title="Epics & initiatives"
        />
        <ResourceSection
          projectId={projectId}
          resource="releases"
          title="Releases & versions"
        />
      </div>
      <Modal
        isOpen={creating}
        onClose={() => setCreating(false)}
        title="Create sprint"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(
              { name, goal },
              {
                onSuccess: () => {
                  setCreating(false);
                  setName("");
                },
                onError: (e) => setError(apiError(e)),
              },
            );
          }}
        >
          <Input
            label="Sprint name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            label="Sprint goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-rose-500">
              {error}
            </p>
          )}
          <Button type="submit" isLoading={create.isPending}>
            Create sprint
          </Button>
        </form>
      </Modal>
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected?.status === "active" ? "Complete sprint" : "Start sprint"
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!selected) return;
            transition.mutate(
              {
                id: selected.id,
                status: selected.status === "active" ? "completed" : "active",
                ...(selected.status === "active"
                  ? { carry_to: carry || undefined }
                  : {
                      start_date: start,
                      end_date: dateKey(
                        addDays(
                          new Date(`${start}T12:00:00`),
                          Number(weeks) * 7,
                        ),
                      ),
                      goal,
                    }),
              },
              {
                onSuccess: () => setSelected(null),
                onError: (e) => setError(apiError(e)),
              },
            );
          }}
        >
          {selected?.status === "active" ? (
            <>
              <p className="text-sm text-slate-500">
                Completed work stays in the sprint history. Unfinished tasks
                move to the backlog or your chosen planned sprint.
              </p>
              <CustomSelect
                label="Carry unfinished tasks to"
                value={carry}
                options={[
                  { value: "", label: "Product backlog" },
                  ...sprints
                    .filter((s) => s.status === "planned")
                    .map((s) => ({ value: s.id, label: s.name })),
                ]}
                onChange={setCarry}
              />
            </>
          ) : (
            <>
              <Input
                label="Start date"
                type="date"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <CustomSelect
                label="Duration"
                value={weeks}
                onChange={setWeeks}
                options={["1", "2", "3", "4"].map((value) => ({
                  value,
                  label: `${value} weeks`,
                }))}
              />
              <Textarea
                label="Sprint goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </>
          )}
          {error && (
            <p role="alert" className="text-rose-500">
              {error}
            </p>
          )}
          <Button type="submit" isLoading={transition.isPending}>
            {selected?.status === "active" ? "Complete sprint" : "Start sprint"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
