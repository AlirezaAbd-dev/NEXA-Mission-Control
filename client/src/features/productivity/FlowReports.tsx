import { useProductivity } from "@/hooks/productivity/useProductivity";
interface Report {
  cycles: { id: string; title: string; hours: number; resolved_at: string }[];
  flow: { day: string; status: string; status_type: string; count: number }[];
}
export function FlowReports({ projectId }: { projectId: string }) {
  const { data } = useProductivity<Report>(`projects/${projectId}/reports`);
  const samples = (data?.cycles || [])
    .map((c) => c.hours)
    .filter(Number.isFinite)
    .toSorted((a, b) => a - b);
  const percentile = (p: number) =>
    samples.length
      ? samples[
          Math.min(samples.length - 1, Math.ceil(samples.length * p) - 1)
        ].toFixed(1)
      : "—";
  const days = [...new Set(data?.flow.map((r) => r.day) || [])];
  const states = [...new Set(data?.flow.map((r) => r.status) || [])];
  const colors = [
    "#0d9488",
    "#38bdf8",
    "#a78bfa",
    "#f59e0b",
    "#f43f5e",
    "#64748b",
  ];
  const maximum = Math.max(
    1,
    ...days.map(
      (d) =>
        data?.flow
          .filter((r) => r.day === d)
          .reduce((n, r) => n + r.count, 0) || 0,
    ),
  );
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Flow & cycle-time reports</h2>
      <div className="flex flex-wrap gap-6 text-sm">
        <span>Median cycle time: {percentile(0.5)} hours</span>
        <span>85th percentile: {percentile(0.85)} hours</span>
        <span>{samples.length} completed samples</span>
      </div>
      <p className="text-xs text-slate-500">
        History starts when tracking is enabled. Cycle time starts at the first
        recorded active state, falling back to task creation.
      </p>
      <div className="rounded-xl border border-slate-200 dark:border-[#183035] p-4">
        <h3 className="font-semibold">Cumulative flow · last 30 days</h3>
        <svg
          viewBox="0 0 720 260"
          role="img"
          aria-label="Cumulative flow chart"
        >
          {states.map((state, i) => {
            const lower = states.slice(0, i);
            const top = days.map(
              (d, j) =>
                `${20 + (j * 680) / Math.max(1, days.length - 1)},${220 - ((data?.flow.filter((r) => r.day === d && (lower.includes(r.status) || r.status === state)).reduce((n, r) => n + r.count, 0) || 0) * 190) / maximum}`,
            );
            const bottom = [...days]
              .reverse()
              .map(
                (d, j) =>
                  `${20 + ((days.length - 1 - j) * 680) / Math.max(1, days.length - 1)},${220 - ((data?.flow.filter((r) => r.day === d && lower.includes(r.status)).reduce((n, r) => n + r.count, 0) || 0) * 190) / maximum}`,
              );
            return (
              <polygon
                key={state}
                points={[...top, ...bottom].join(" ")}
                fill={colors[i % colors.length]}
                opacity=".8"
              />
            );
          })}
          <text x="20" y="245" fontSize="11" fill="#64748b">
            {days[0]}
          </text>
          <text x="610" y="245" fontSize="11" fill="#64748b">
            {days.at(-1)}
          </text>
        </svg>
        <p className="text-sm">{states.join(" · ")}</p>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-[#183035] p-4">
        <h3 className="font-semibold">Cycle-time scatter chart</h3>
        <svg
          viewBox="0 0 720 200"
          role="img"
          aria-label="Cycle-time scatter chart"
        >
          {(data?.cycles || [])
            .slice()
            .reverse()
            .map((c, i) => (
              <circle
                key={c.id}
                cx={20 + (i * 680) / Math.max(1, samples.length - 1)}
                cy={170 - (c.hours * 145) / Math.max(1, ...samples)}
                r="4"
                fill="#0d9488"
              >
                <title>
                  {c.title}: {c.hours.toFixed(1)} hours
                </title>
              </circle>
            ))}
        </svg>
        {!samples.length && (
          <p className="text-slate-500 text-sm">
            Complete tasks to collect cycle-time samples.
          </p>
        )}
      </div>
    </section>
  );
}
