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
  { key: "board", title: "Board", icon: Kanban },
  { key: "list", title: "Table", icon: TableProperties },
  { key: "timeline", title: "Timeline", icon: GanttChart },
  { key: "calendar", title: "Calendar", icon: CalendarDays },
  { key: "backlog", title: "Backlog", icon: Layers },
  { key: "insights", title: "Insights", icon: ChartNoAxesCombined },
  { key: "automation", title: "Automation", icon: Zap },
  { key: "service-desk", title: "Service desk", icon: Layers },
  { key: "governance", title: "Project settings", icon: Shield },
];
export function ViewTabs({ projectId }: { projectId: string }) {
  return (
    <nav
      aria-label="Project views"
      className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200/80 dark:border-[#183035] scrollbar-none shrink-0"
    >
      {tabs.map(({ key, title, icon: Icon }) => (
        <NavLink
          key={key}
          to={`/p/${projectId}/${key}`}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold shrink-0 transition-all ${
              isActive
                ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25 shadow-2xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-[#132428]"
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
