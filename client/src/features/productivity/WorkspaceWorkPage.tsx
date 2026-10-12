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
        <h1 className="text-2xl font-bold">Workspace command center</h1>
        <p className="text-slate-500">
          Plan across projects and keep your personal work organized.
        </p>
      </header>
      <nav className="flex flex-wrap gap-2">
        {[
          ["work", "All projects"],
          ["calendar", "Workspace calendar"],
          ["timeline", "Portfolio timeline"],
          ["workload", "Workload"],
          ["inbox", "Inbox"],
          ["planner", "Planner"],
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
      {isLoading && <p>Loading workspace…</p>}
      {error && (
        <p role="alert" className="text-rose-500">
          Could not load workspace work.
        </p>
      )}
      {tab === "inbox" ? (
        <InboxPanel workspaceId={workspaceId} />
      ) : tab === "planner" ? (
        <PlannerPanel cards={cards} />
      ) : (
        <>
          <div className="flex gap-3">
            <Input
              placeholder="Search titles, assignees, types"
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
                { value: "", label: "All projects" },
                ...projectOptions,
              ]}
            />
          </div>
          {tab === "timeline" ? (
            <BoardGanttView
              title="Portfolio timeline"
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    {[
                      "Task",
                      "Project",
                      "Type",
                      "Status",
                      "Assignees",
                      "Due",
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
                        className="border-t border-slate-200 dark:border-[#183035]"
                      >
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => open(c.id)}
                          >
                            {c.title}
                          </Button>
                        </td>
                        <td>{c.project_name}</td>
                        <td>{c.work_type || "Task"}</td>
                        <td>{c.status}</td>
                        <td>{c.assignees || "Unassigned"}</td>
                        <td>{c.due_date || "—"}</td>
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
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-slate-500">
                    Page {activePage + 1} of {pages} · {filtered.length} tasks
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={activePage === pages - 1}
                    onClick={() => setPage(activePage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
