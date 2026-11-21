import { formatNumber } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import { BoardGanttView } from "@/features/views/BoardGanttView";
import { TeamCapacity } from "./TeamCapacity";
import { useState } from "react";
import { useParams } from "react-router";
import { Button, Input, CustomSelect } from "@/components/ui";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useUiStore } from "@/stores/ui.store";
import { InboxPanel } from "./InboxPanel";
import { BoardCalendarView } from "@/features/views/BoardCalendarView";
import { PlannerPanel } from "./PlannerPanel";
import type { WorkCard } from "@/types/productivity";
export function WorkspaceWorkPage() {
  useUiLocale();
  const { workspaceId = "" } = useParams(),
    {
      data: cards = [],
      isLoading,
      error,
    } = useProductivity<WorkCard[]>(
      `workspaces/${workspaceId}/work`,
      !!workspaceId,
    ),
    open = useUiStore((s) => s.openCardModal);
  const [tab, setTab] = useState("work"),
    [search, setSearch] = useState(""),
    [project, setProject] = useState(""),
    [page, setPage] = useState(0);
  const filtered = cards.filter(
    (c) =>
      (!project || c.project_id === project) &&
      `${c.title} ${c.assignees} ${c.work_type}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const projectOptions = [
    ...new Map(cards.map((c) => [c.project_id, c.project_name])).entries(),
  ].map(([value, label]) => ({ value, label }));
  const pages = Math.max(1, Math.ceil(filtered.length / 100)),
    activePage = Math.min(page, pages - 1);
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{tr("Workspace command center")}</h1>
        <p className="text-slate-500">{tr("Plan across projects and keep your personal work organized.")}</p>
      </header>
      <nav className="flex flex-wrap gap-2">
        {[
          ["work", tr("All projects")],
          ["calendar", tr("Workspace calendar")],
          ["timeline", tr("Portfolio timeline")],
          ["workload", tr("Workload")],
          ["inbox", tr("Inbox")],
          ["planner", tr("Planner")],
        ].map(([id, label]) => (
          <Button
            key={id}
            variant={tab === id ? "primary" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </nav>
      {isLoading && <p>{tr("Loading workspace…")}</p>}
      {error && (
        <p role="alert" className="text-rose-500">{tr("Could not load workspace work.")}</p>
      )}
      {tab === "inbox" ? (
        <InboxPanel workspaceId={workspaceId} />
      ) : tab === "planner" ? (
        <PlannerPanel cards={cards} />
      ) : (
        <>
          <div className="flex gap-3">
            <Input
              placeholder={tr("Search titles, assignees, types")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
            <CustomSelect
              value={project}
              onChange={(value) => {
                setProject(value);
                setPage(0);
              }}
              options={[
                { value: "", label: tr("All projects") },
                ...projectOptions,
              ]}
            />
          </div>
          {tab === "timeline" ? (
            <BoardGanttView
              title={tr("Portfolio timeline")}
              cards={filtered.map((c) => ({
                ...c,
                title: c.project_name + " · " + c.title,
              }))}
              projectId=""
            />
          ) : tab === "calendar" ? (
            <BoardCalendarView cards={filtered} projectId="" />
          ) : tab === "workload" ? (
            <TeamCapacity workspaceId={workspaceId} cards={filtered} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-responsive-table>
                <thead>
                  <tr className="text-start text-slate-500">
                    {[
                      tr("Task"),
                      tr("Project"),
                      tr("Type"),
                      tr("Status"),
                      tr("Assignees"),
                      tr("Due"),
                    ].map((t) => (
                      <th className="p-3" key={t}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .slice(activePage * 100, (activePage + 1) * 100)
                    .map((c) => (
                      <tr
                        key={c.id}
                        className="border-t border-slate-200 dark:border-white/[0.06]"
                      >
                        <td className="p-3" data-label={tr("Task")}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => open(c.id)}
                          >
                            {c.title}
                          </Button>
                        </td>
                        <td data-label={tr("Project")}>{c.project_name}</td>
                        <td data-label={tr("Type")}>{c.work_type || tr("Task")}</td>
                        <td data-label={tr("Status")}>{c.status}</td>
                        <td data-label={tr("Assignees")}>{c.assignees || tr("Unassigned")}</td>
                        <td data-label={tr("Due")}>{c.due_date || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {pages > 1 && (
                <div className="flex justify-between items-center gap-3 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={activePage === 0}
                    onClick={() => setPage(activePage - 1)}
                  >{tr("Previous")}</Button>
                  <span className="text-xs text-slate-500">{tr("Page")}{activePage + 1}{" "}{tr("of")}{" "}{pages} · {formatNumber(filtered.length)}{tr("tasks")}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={activePage === pages - 1}
                    onClick={() => setPage(activePage + 1)}
                  >{tr("Next")}</Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
