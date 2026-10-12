import { useNow } from "@/hooks/useNow";
import { useParams } from "react-router";
import { useCards } from "@/hooks/card/useCards";
import { useBoard } from "@/hooks/board/useBoard";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import { ViewTabs } from "@/features/views/ViewTabs";
import type { SprintSnapshot } from "@/types/enterprise";
import { daysBetween, parseDay } from "@/features/views/boardDates";
export function InsightsPage() {
  const now = useNow();
  const { projectId = "" } = useParams(),
    { data: cards = [] } = useCards({ project_id: projectId }),
    { data: board } = useBoard(projectId),
    { data: snapshots = [] } = useEnterpriseResource<SprintSnapshot[]>(
      projectId,
      "snapshots",
    );
  const done = cards.filter(
      (c) =>
        board?.columns.find((col) => col.id === c.column_id)?.type_ === "done",
    ),
    overdue = cards.filter(
      (c) =>
        c.due_date &&
        c.due_date.slice(0, 10) < new Date(now).toISOString().slice(0, 10) &&
        !done.includes(c),
    );
  const active = snapshots.find((s) => s.status === "active"),
    points = snapshots.filter(
      (s) => s.sprint_id === active?.sprint_id && s.day,
    ),
    max = Math.max(
      1,
      active?.committed || 0,
      ...points.map((s) => s.remaining_points || 0),
    );
  const duration =
    active?.start_date && active?.end_date
      ? Math.max(
          1,
          daysBetween(parseDay(active.start_date), parseDay(active.end_date)),
        )
      : 14;
  const path = points
    .map(
      (s, i) =>
        `${i ? "L" : "M"}${40 + (Math.min(duration, Math.max(0, daysBetween(parseDay(active?.start_date || s.day || ""), parseDay(s.day || "")))) / duration) * 500},${210 - ((s.remaining_points || 0) / max) * 170}`,
    )
    .join(" ");
  const velocity = Array.from(
      new Map(
        snapshots
          .filter((s) => s.status === "completed")
          .map((s) => [s.sprint_id, s]),
      ).values(),
    ).slice(-5),
    vmax = Math.max(1, ...velocity.map((s) => s.committed));
  return (
    <div className="p-4 md:p-6 space-y-5">
      <ViewTabs projectId={projectId} />
      <h1 className="text-2xl font-bold">Delivery insights</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Total tasks", cards.length],
          ["Completed", done.length],
          ["Overdue", overdue.length],
          [
            "Story points",
            cards.reduce((n, c) => n + (c.story_points || 0), 0),
          ],
        ].map(([label, value]) => (
          <section
            key={label}
            className="p-5 rounded-xl bg-white dark:bg-[#0d1a1d] border border-slate-200 dark:border-[#183035]"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400 mt-2">
              {value}
            </p>
          </section>
        ))}
      </div>
      <FlowReports projectId={projectId} />
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Sprint burndown"
          subtitle={active?.name || "Start a sprint to begin daily tracking"}
        >
          {active ? (
            <svg
              viewBox="0 0 580 260"
              role="img"
              aria-label="Ideal versus actual remaining story points"
            >
              <path d="M40 30 V210 H540" stroke="#64748b" fill="none" />
              <path
                d={`M40 ${210 - (active.committed / max) * 170} L540 210`}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                fill="none"
              />
              <path d={path} stroke="#0d9488" strokeWidth="3" fill="none" />
              {points.map((s) => (
                <text key={s.day} x="45" y="248" fontSize="10" fill="#64748b">
                  {points[points.length - 1] === s
                    ? `Latest snapshot: ${s.day} · ${s.remaining_points} pts remaining`
                    : ""}
                </text>
              ))}
              <text x="40" y="15" fill="#64748b" fontSize="11">
                {max} pts · Teal: actual · Dashed: ideal
              </text>
            </svg>
          ) : (
            <p className="p-10 text-slate-500 text-sm">
              Daily snapshots are recorded while a sprint is active.
            </p>
          )}
        </ChartPanel>
        <ChartPanel
          title="Sprint velocity"
          subtitle="Committed versus completed points · Last five sprints"
        >
          {velocity.length ? (
            <svg
              viewBox="0 0 580 260"
              role="img"
              aria-label="Sprint velocity bar chart"
            >
              {velocity.map((s, i) => (
                <g key={s.sprint_id}>
                  <rect
                    x={i * 105 + 30}
                    y={210 - (s.committed / vmax) * 170}
                    width="30"
                    height={(s.committed / vmax) * 170}
                    fill="#94a3b8"
                    rx="3"
                  />
                  <rect
                    x={i * 105 + 62}
                    y={210 - (s.completed / vmax) * 170}
                    width="30"
                    height={(s.completed / vmax) * 170}
                    fill="#0d9488"
                    rx="3"
                  />
                  <text x={i * 105 + 30} y="235" fontSize="10" fill="#64748b">
                    {s.name.slice(0, 14)}
                  </text>
                </g>
              ))}
              <text x="30" y="15" fontSize="11" fill="#64748b">
                Grey: committed · Teal: completed
              </text>
            </svg>
          ) : (
            <p className="p-10 text-slate-500 text-sm">
              Complete your first sprint to see velocity.
            </p>
          )}
        </ChartPanel>
      </div>
      <ChartPanel
        title="Workflow distribution"
        subtitle="Task count and WIP limits by column"
      >
        <div className="space-y-4 p-4">
          {board?.columns.map((col) => {
            const n = cards.filter((c) => c.column_id === col.id).length;
            return (
              <div
                key={col.id}
                className="grid grid-cols-[160px_1fr_60px] items-center gap-3 text-sm"
              >
                <span>{col.name}</span>
                <progress
                  aria-label={`${col.name} task count`}
                  className="w-full h-3 accent-teal-500"
                  value={n}
                  max={Math.max(1, cards.length)}
                />
                <span className="text-slate-500">
                  {n}
                  {col.wip_limit ? `/${col.wip_limit}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </ChartPanel>
    </div>
  );
}
function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="p-5 rounded-xl border border-slate-200 dark:border-[#183035] bg-white dark:bg-[#0d1a1d]">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-xs text-slate-500 mt-1 mb-4">{subtitle}</p>
      {children}
    </section>
  );
}
import { FlowReports } from "@/features/productivity/FlowReports";
