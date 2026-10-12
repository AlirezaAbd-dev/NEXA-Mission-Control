import { Input } from "@/components/ui";
import { useWorkspaceMembers } from "@/hooks/workspace/useWorkspaceMembers";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
import { useNow } from "@/hooks/useNow";
import type { WorkCard } from "@/types/productivity";
export function TeamCapacity({
  workspaceId,
  cards,
}: {
  workspaceId: string;
  cards: WorkCard[];
}) {
  const { data: members = [] } = useWorkspaceMembers(workspaceId),
    { data: capacities = [] } = useProductivity<
      { user_id: string; weekly_hours: number }[]
    >(`workspaces/${workspaceId}/capacity`),
    save = useProductivityMutation(),
    now = useNow();
  const end = new Date(now + 7 * 86400000).toISOString().slice(0, 10);
  return (
    <section className="space-y-4">
      <p className="text-sm text-slate-500">
        Upcoming workload includes unfinished tasks due within seven days, plus
        unscheduled work. Capacity is weekly availability; administrators can
        change it.
      </p>
      <div className="grid md:grid-cols-3 gap-4">
        {members.map((m) => {
          const work = cards.filter(
            (c) =>
              c.status_type !== "done" &&
              c.assignee_ids.split(",").includes(m.user_id) &&
              (!c.due_date || c.due_date.slice(0, 10) <= end),
          );
          const hours = work.reduce((n, c) => n + (c.estimated_hours || 0), 0),
            available =
              capacities.find((c) => c.user_id === m.user_id)?.weekly_hours ??
              40;
          return (
            <div
              key={m.user_id}
              className="p-4 border rounded-xl border-slate-200 dark:border-[#183035] space-y-3"
            >
              <h3 className="font-semibold">{m.display_name}</h3>
              <p
                className={
                  hours > available
                    ? "text-rose-500"
                    : "text-teal-600 dark:text-teal-400"
                }
              >
                {hours} / {available} hours ·{" "}
                {hours > available ? "Over capacity" : "Available"}
              </p>
              <progress
                className="w-full accent-teal-500"
                max={Math.max(available, hours, 1)}
                value={hours}
              />
              <p className="text-sm text-slate-500">
                {work.length} tasks ·{" "}
                {work.reduce((n, c) => n + (c.story_points || 0), 0)} points
              </p>
              <Input
                key={`${m.user_id}:${available}`}
                label="Weekly available hours"
                type="number"
                min={0}
                max={168}
                defaultValue={available}
                onBlur={(e) => {
                  const h = Number(e.target.value);
                  if (h !== available)
                    save.mutate({
                      path: `workspaces/${workspaceId}/capacity`,
                      data: { user_id: m.user_id, weekly_hours: h },
                    });
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
