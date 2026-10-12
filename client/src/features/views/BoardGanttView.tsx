import { useNow } from "@/hooks/useNow";
import { useState } from "react";
import { Button, CustomSelect } from "@/components/ui";
import type { Card } from "@/types";
import { useUiStore } from "@/stores/ui.store";
import { useUpdateCard } from "@/hooks/card/useUpdateCard";
import { useProjectLinks } from "@/hooks/enterprise/useProjectLinks";
import { addDays, dateKey, daysBetween, parseDay } from "./boardDates";
import { apiError } from "@/lib/apiError";
const colors: Record<string, string> = {
  urgent: "#f43f5e",
  high: "#f59e0b",
  medium: "#0d9488",
  low: "#5eead4",
  no_priority: "#64748b",
};
export function BoardGanttView({
  cards,
  projectId,
  title = "Project timeline",
}: {
  cards: Pick<Card, "id" | "title" | "priority" | "start_date" | "due_date">[];
  projectId: string;
  title?: string;
}) {
  const now = useNow();
  const [zoom, setZoom] = useState("weeks"),
    [error, setError] = useState("");
  const open = useUiStore((s) => s.openCardModal),
    update = useUpdateCard(projectId),
    { data: links = [] } = useProjectLinks(projectId);
  const scheduled = cards
    .filter((c) => c.due_date)
    .sort((a, b) =>
      (a.start_date || a.due_date || "").localeCompare(
        b.start_date || b.due_date || "",
      ),
    );
  const today = new Date(now);
  const first = scheduled.length
    ? parseDay(
        scheduled[0].start_date || scheduled[0].due_date || dateKey(today),
      )
    : today;
  const start = addDays(first, -3);
  const end = scheduled.reduce(
    (d, c) =>
      c.due_date && parseDay(c.due_date) > d ? parseDay(c.due_date) : d,
    addDays(start, 30),
  );
  const dayWidth = zoom === "days" ? 48 : zoom === "weeks" ? 22 : 9,
    width = Math.max(900, (daysBetween(start, end) + 8) * dayWidth),
    height = scheduled.length * 48 + 50;
  const x = (value: string) => daysBetween(start, parseDay(value)) * dayWidth;
  const y = (id: string) => scheduled.findIndex((c) => c.id === id) * 48 + 62;
  const move = (
    card: Pick<Card, "id" | "start_date" | "due_date">,
    delta: number,
    resize: boolean,
  ) =>
    update.mutate(
      {
        id: card.id,
        due_date: dateKey(
          addDays(parseDay(card.due_date || dateKey(today)), delta),
        ),
        ...(!resize
          ? {
              start_date: dateKey(
                addDays(
                  parseDay(card.start_date || card.due_date || dateKey(today)),
                  delta,
                ),
              ),
            }
          : {}),
      },
      { onError: (e) => setError(apiError(e)) },
    );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-xs text-slate-500">
            Drag bars to move tasks; drag the end handle to change duration.
          </p>
        </div>
        <CustomSelect
          className="w-36"
          value={zoom}
          onChange={setZoom}
          options={["days", "weeks", "months"].map((value) => ({
            value,
            label: value,
          }))}
        />
      </div>
      {error && (
        <p className="text-rose-500" role="alert">
          {error}
        </p>
      )}
      {scheduled.length === 0 ? (
        <div className="p-12 rounded-xl border border-dashed border-slate-300 dark:border-[#183035] text-center">
          <p className="font-semibold">Schedule your first task</p>
          <p className="text-sm text-slate-500 mt-2">
            Add start and due dates from the table or task detail view.
          </p>
        </div>
      ) : (
        <div className="flex rounded-xl border border-slate-200 dark:border-[#183035] bg-white dark:bg-[#0d1a1d] overflow-hidden">
          <div className="w-52 shrink-0 border-e border-slate-200 dark:border-[#183035]">
            <div className="h-[50px] p-4 text-xs text-slate-500">Task</div>
            {scheduled.map((c) => (
              <Button
                key={c.id}
                variant="ghost"
                className="w-full h-12 justify-start rounded-none truncate text-xs"
                onClick={() => open(c.id)}
              >
                {c.title}
              </Button>
            ))}
          </div>
          <div className="overflow-auto flex-1">
            <svg
              width={width}
              height={height}
              role="img"
              aria-label="Task timeline with dependencies"
              className="text-slate-500"
            >
              <defs>
                <marker
                  id="dependency-arrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6" fill="#64748b" />
                </marker>
              </defs>
              {Array.from({ length: Math.ceil(width / dayWidth) }, (_, i) => (
                <g key={i}>
                  <line
                    x1={i * dayWidth}
                    x2={i * dayWidth}
                    y1={30}
                    y2={height}
                    stroke="currentColor"
                    opacity="0.12"
                  />
                  {(zoom === "months"
                    ? addDays(start, i).getDate() === 1 || i === 0
                    : i % (zoom === "weeks" ? 7 : 1) === 0) && (
                    <text
                      x={i * dayWidth + 4}
                      y={22}
                      fill="currentColor"
                      fontSize={10}
                    >
                      {addDays(start, i).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </text>
                  )}
                </g>
              ))}
              <line
                x1={x(dateKey(today))}
                x2={x(dateKey(today))}
                y1={30}
                y2={height}
                stroke="#2dd4bf"
                strokeDasharray="4 4"
              />
              {links
                .filter(
                  (l) =>
                    l.link_type === "blocks" &&
                    scheduled.some((c) => c.id === l.source_card_id) &&
                    scheduled.some((c) => c.id === l.target_card_id),
                )
                .map((l) => {
                  const a = scheduled.find((c) => c.id === l.source_card_id),
                    b = scheduled.find((c) => c.id === l.target_card_id);
                  if (!a || !b) return null;
                  const ax = x(a.due_date || "") + dayWidth,
                    bx = x(b.start_date || b.due_date || "");
                  return (
                    <path
                      key={l.id}
                      d={`M${ax},${y(a.id)} H${ax + 8} V${y(b.id)} H${bx}`}
                      stroke="#64748b"
                      fill="none"
                      markerEnd="url(#dependency-arrow)"
                    />
                  );
                })}
              {scheduled.map((c) => {
                const left = x(c.start_date || c.due_date || ""),
                  barWidth = Math.max(
                    dayWidth,
                    x(c.due_date || "") - left + dayWidth,
                  ),
                  rowY = y(c.id) - 12;
                const drag = (
                  e: React.PointerEvent<SVGElement>,
                  resize: boolean,
                ) => {
                  const origin = e.clientX;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const target = e.currentTarget;
                  const finish = (ev: PointerEvent) => {
                    target.removeEventListener("pointerup", finish);
                    const delta = Math.round((ev.clientX - origin) / dayWidth);
                    if (delta !== 0) move(c, delta, resize);
                  };
                  target.addEventListener("pointerup", finish, { once: true });
                };
                return (
                  <g key={c.id}>
                    <rect
                      x={left}
                      y={rowY}
                      width={barWidth}
                      height={24}
                      rx={5}
                      fill={colors[c.priority] || "#0d9488"}
                      opacity="0.8"
                      className="cursor-grab"
                      onPointerDown={(e) => drag(e, false)}
                      onDoubleClick={() => open(c.id)}
                    />
                    {c.start_date?.slice(0, 10) ===
                      c.due_date?.slice(0, 10) && (
                      <path
                        d={`M${left},${rowY + 12} l8,-8 l8,8 l-8,8 z`}
                        fill="#2dd4bf"
                      />
                    )}
                    <rect
                      x={left + barWidth - 5}
                      y={rowY}
                      width={7}
                      height={24}
                      fill="#2dd4bf"
                      rx={2}
                      className="cursor-ew-resize"
                      onPointerDown={(e) => drag(e, true)}
                    />
                    <text
                      x={left + 8}
                      y={rowY + 16}
                      fontSize={10}
                      fill="white"
                      pointerEvents="none"
                    >
                      {c.title.slice(0, Math.floor(barWidth / 7))}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
