import { useNow } from "@/hooks/useNow";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import type { Card } from "@/types";
import { useUpdateCard } from "@/hooks/card/useUpdateCard";
import { useUiStore } from "@/stores/ui.store";
import { addDays, dateKey, parseDay, reschedule } from "./boardDates";
import { apiError } from "@/lib/apiError";
export function BoardCalendarView({
  cards,
  projectId,
}: {
  cards: Pick<Card, "id" | "title" | "start_date" | "due_date">[];
  projectId: string;
}) {
  const now = useNow();
  const [current, setCurrent] = useState(() => new Date(now)),
    [mode, setMode] = useState<"month" | "week">("month"),
    [error, setError] = useState("");
  const update = useUpdateCard(projectId),
    open = useUiStore((s) => s.openCardModal);
  const first =
    mode === "month"
      ? new Date(current.getFullYear(), current.getMonth(), 1)
      : new Date(current);
  first.setDate(first.getDate() - first.getDay());
  const dates = Array.from({ length: mode === "month" ? 42 : 7 }, (_, i) =>
    addDays(first, i),
  );
  const navigate = (direction: number) =>
    setCurrent(
      mode === "month"
        ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
        : addDays(current, direction * 7),
    );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-xl font-bold">
          {current.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "month" ? "primary" : "outline"}
            onClick={() => setMode("month")}
          >
            Month
          </Button>
          <Button
            size="sm"
            variant={mode === "week" ? "primary" : "outline"}
            onClick={() => setMode("week")}
          >
            Week
          </Button>
          <Button
            aria-label="Previous period"
            size="icon"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrent(new Date(now))}
          >
            Today
          </Button>
          <Button
            aria-label="Next period"
            size="icon"
            variant="outline"
            onClick={() => navigate(1)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-rose-500 text-sm">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <div className="min-w-[700px] grid grid-cols-7 border border-slate-200 dark:border-[#183035] rounded-xl overflow-hidden bg-white dark:bg-[#0d1a1d]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-3 text-xs text-center bg-slate-50 dark:bg-[#132428] text-slate-500"
            >
              {day}
            </div>
          ))}
          {dates.map((date) => {
            const key = dateKey(date),
              today = key === dateKey(new Date(now));
            return (
              <div
                key={key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const card = cards.find(
                    (c) => c.id === e.dataTransfer.getData("text/plain"),
                  );
                  if (card)
                    update.mutate(reschedule(card, key), {
                      onError: (e) => setError(apiError(e)),
                    });
                }}
                className={`p-2 min-h-32 border-t border-e border-slate-200 dark:border-[#183035] ${today ? "bg-teal-500/10" : ""} ${date.getMonth() !== current.getMonth() && mode === "month" ? "opacity-50" : ""}`}
              >
                <span
                  className={`text-xs font-semibold ${today ? "text-teal-500" : "text-slate-500"}`}
                >
                  {date.getDate()}
                </span>
                <div className="space-y-1 mt-2">
                  {cards
                    .filter(
                      (c) =>
                        c.due_date &&
                        key <= c.due_date.slice(0, 10) &&
                        key >= (c.start_date || c.due_date).slice(0, 10),
                    )
                    .map((c) => (
                      <Button
                        key={c.id}
                        size="sm"
                        variant="ghost"
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/plain", c.id)
                        }
                        onClick={() => open(c.id)}
                        className="block w-full truncate text-start bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs"
                        title={`${c.title} · ${parseDay(c.due_date || key).toLocaleDateString()}`}
                      >
                        {c.title}
                      </Button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Drag a task to a date to move its entire date range. Open a task to
        change its details.
      </p>
    </div>
  );
}
