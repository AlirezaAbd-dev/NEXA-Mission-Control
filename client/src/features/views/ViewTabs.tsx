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
  { key: "governance", title: "Project settings", icon: Shield },
];
export function ViewTabs({ projectId }: { projectId: string }) {
  return (
    <nav
      aria-label="Project views"
      className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-[#183035] pb-3"
    >
      {tabs.map(({ key, title, icon: Icon }) => (
        <NavLink
          key={key}
          to={`/p/${projectId}/${key}`}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${isActive ? "bg-teal-500/15 text-teal-600 dark:text-teal-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-[#132428]"}`
          }
        >
          <Icon size={15} />
          {title}
        </NavLink>
      ))}
    </nav>
  );
}
