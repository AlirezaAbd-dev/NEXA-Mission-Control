import { tr, useUiLocale } from "@/i18n";
import { NavLink } from "react-router";
import {
  Kanban,
  TableProperties,
  CalendarDays,
  GanttChart,
  Layers,
  Zap,
  Shield,
  ChartNoAxesCombined,
} from "lucide-react";
const tabs = [
  { key: "board", get title() { return tr("Board"); }, icon: Kanban },
  { key: "list", get title() { return tr("Table"); }, icon: TableProperties },
  { key: "timeline", get title() { return tr("Timeline"); }, icon: GanttChart },
  { key: "calendar", get title() { return tr("Calendar"); }, icon: CalendarDays },
  { key: "backlog", get title() { return tr("Backlog"); }, icon: Layers },
  { key: "insights", get title() { return tr("Insights"); }, icon: ChartNoAxesCombined },
  { key: "automation", get title() { return tr("Automation"); }, icon: Zap },
  { key: "service-desk", get title() { return tr("Service desk"); }, icon: Layers },
  { key: "governance", get title() { return tr("Project settings"); }, icon: Shield },
];
export function ViewTabs({ projectId }: { projectId: string }) {
  useUiLocale();
  return (
    <nav
      aria-label={tr("Project views")}
      className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200/80 dark:border-white/[0.06] scrollbar-none shrink-0"
    >
      {tabs.map(({ key, title, icon: Icon }) => (
        <NavLink
          key={key}
          to={`/p/${projectId}/${key}`}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold shrink-0 transition-all ${
              isActive
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shadow-2xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/[0.05]"
            }`
          }
        >
          <Icon size={14} className="shrink-0" />
          <span className="whitespace-nowrap">{title}</span>
        </NavLink>
      ))}
    </nav>
  );
}
