import { ArrowUpRight, Flag, Link2 } from "lucide-react";
import { useUiStore } from "@/stores/ui.store";
import type { DashboardTask } from "./types";
import { dueLabel } from "./dashboardDates";
export function DashboardTasks({ tasks, today, empty }: { tasks: DashboardTask[]; today: string; empty: string }) {
  const open = useUiStore(s => s.openCardModal);
  return tasks.length ? <div className="divide-y divide-border/60">{tasks.map(task => {
    const overdue = !!task.due_date && task.due_date.slice(0, 10) < today;
    return <button key={task.id} type="button" onClick={() => open(task.id)} className="group w-full min-w-0 py-3 text-start flex gap-3 items-start rounded-lg px-2 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors">
      <span className="mt-1 size-2 rounded-full bg-primary/60 shrink-0" />
      <span className="min-w-0 flex-1 space-y-1.5"><span dir="auto" className="block break-words text-sm font-medium group-hover:text-primary">{task.title}</span><span className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground"><span>{task.project_name}</span><span>· {task.status}</span><span className={overdue ? "text-danger" : ""}>{overdue ? "Overdue · " : ""}{dueLabel(task.due_date)}</span>{task.priority === "urgent" && <span className="inline-flex gap-1 items-center text-danger"><Flag size={12} />Urgent</span>}{task.blocked && <span className="inline-flex gap-1 items-center text-amber-600 dark:text-amber-400"><Link2 size={12} />Blocked</span>}</span></span>
      <ArrowUpRight size={15} className="shrink-0 mt-1 text-muted-foreground group-hover:text-primary" />
    </button>;
  })}</div> : <div className="rounded-xl border border-dashed border-border py-7 px-4 text-center text-sm text-muted-foreground">{empty}</div>;
}
