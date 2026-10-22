import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { CheckCircle2, Clock, AlertCircle, ArrowUpRight, FolderKanban, Edit2, Trash2, Plus, NotebookPen, CalendarDays, History, Lock, Users, Pin, RefreshCw } from "lucide-react";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { useActiveWorkspace } from "@/hooks/workspace/useActiveWorkspace";
import { useProjects } from "@/hooks/project/useProjects";
import { useDeleteProject } from "@/hooks/project/useDeleteProject";
import { useUiStore } from "@/stores/ui.store";
import { useCreateNote } from "@/hooks/notes/useNotes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { EditProjectModal } from "@/features/project/EditProjectModal";
import { apiError } from "@/lib/apiError";
import { formatRelativeTime } from "@/lib/utils";
import { useWorkspaceDashboard } from "./useWorkspaceDashboard";
import { DashboardTasks } from "./DashboardTasks";
import { dueLabel } from "./dashboardDates";
import { QuickTaskModal } from "./QuickTaskModal";
import type { Project } from "@/types";

function Panel({ title, description, action, children, id }: { title: string; description: string; action?: ReactNode; children: ReactNode; id?: string }) {
  return <Card id={id} className="min-w-0 p-4 sm:p-5 space-y-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted-foreground mt-1">{description}</p></div>{action}</div>{children}</Card>;
}
function Empty({ children }: { children: ReactNode }) { return <p className="rounded-xl border border-dashed border-border py-7 px-4 text-center text-sm text-muted-foreground">{children}</p>; }
export function DashboardPage() {
  const active = useActiveWorkspace();
  return <WorkspaceOverview key={active.currentWorkspaceId} workspace={active.currentWorkspaceId} name={active.currentWorkspace?.name || "Workspace"} role={active.currentWorkspace?.user_role || ""} />;
}
function WorkspaceOverview({ workspace, name, role }: { workspace: string; name: string; role: string }) {
  const navigate = useNavigate();
  const createNote = useCreateNote();
  const { data: user } = useCurrentUser();
  const query = useWorkspaceDashboard(workspace);
  const { data: projectRecords = [] } = useProjects(workspace);
  const remove = useDeleteProject(workspace);
  const openTask = useUiStore(s => s.openCardModal);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [create, setCreate] = useState(false);
  const [tab, setTab] = useState<"overdue" | "today" | "upcoming">("today");
  const data = query.error ? undefined : query.data;
  const workPath = "/w/" + workspace + "/work";
  const notesPath = "/w/" + workspace + "/notes";
  const canManage = ["owner", "admin"].includes(role);
  const writable = data?.projects.filter(p => p.can_write) || [];
  const tasks = data ? tab === "overdue" ? data.mine_overdue : tab === "today" ? data.mine_today : data.mine_upcoming : [];
  const activityLabel = (action: string) => ({ created_card: "created", moved_card: "moved", archived_card: "archived", restored_card: "restored", assigned_card: "assigned", unassigned_card: "unassigned" }[action] || "updated");
  return <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto w-full min-w-0">
    <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0"><p className="text-xs text-primary font-medium mb-1 break-words" dir="auto">{name}</p><h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {user?.display_name || user?.username || "Commander"}</h1><p className="text-sm text-muted-foreground mt-2">Your work, priorities, and team progress in one place.</p></div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <Button variant="ghost" size="icon" aria-label="Refresh dashboard" disabled={query.isFetching || !workspace} onClick={() => void query.refetch()}><RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} /></Button>
        <Link to={workPath} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"><CalendarDays size={15} />Planner</Link>
        <Button variant="outline" size="sm" isLoading={createNote.isPending} disabled={createNote.isPending || !workspace} onClick={() => createNote.mutate({ title: "Untitled note" }, { onSuccess: note => navigate(notesPath + "?" + new URLSearchParams({ scope: "personal", note: note.id })) })}><NotebookPen size={15} />Write a note</Button>
        {!!writable.length && <Button size="sm" onClick={() => setCreate(true)}><Plus size={15} />Create task</Button>}
      </div>
    </header>
    {createNote.error && <p role="alert" className="text-sm text-danger">{apiError(createNote.error)}</p>}
    {!workspace && <Empty>Select or create a workspace from the sidebar to see its overview.</Empty>}
    {query.isLoading && <div role="status" aria-label="Loading dashboard" className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0,1,2,3,4,5].map(i => <div key={i} className={"animate-pulse rounded-2xl bg-muted/50 " + (i > 3 ? "h-72 col-span-2" : "h-28")} />)}<span className="sr-only">Loading workspace dashboard…</span></div>}
    {query.error && <div role="alert" className="rounded-xl border border-danger/30 p-4 text-sm space-y-2"><p className="text-danger">{apiError(query.error)}</p><Button variant="outline" size="sm" onClick={() => void query.refetch()}>Retry dashboard</Button></div>}
    {data && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Active projects", value: data.summary.projects, icon: FolderKanban, detail: "Projects you can access", color: "text-primary" },
          { label: "Open tasks", value: data.summary.pending, icon: Clock, detail: data.summary.mine + " assigned to you", color: "text-primary" },
          { label: "Overdue tasks", value: data.summary.overdue, icon: AlertCircle, detail: "Unfinished work before today", color: "text-danger" },
          { label: "Completed tasks", value: data.summary.completed, icon: CheckCircle2, detail: "Of " + data.summary.tasks + " active tasks", color: "text-emerald-600 dark:text-emerald-400" },
        ].map(item => <Card key={item.label} className="p-4 sm:p-5"><div className="flex justify-between gap-2 text-muted-foreground"><span className="text-xs font-medium">{item.label}</span><item.icon size={18} className={item.color} /></div><p className="text-3xl font-bold tabular-nums mt-3">{item.value.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">{item.detail}</p></Card>)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
        <Panel title="My tasks" description="Assigned to you · up to 6 tasks per group" action={<Link className="text-xs text-primary hover:underline" to={workPath}>Open work hub →</Link>}>
          <div role="group" aria-label="My task filters" className="flex flex-wrap gap-2">{(["overdue", "today", "upcoming"] as const).map(value => <Button size="sm" key={value} variant={tab === value ? "secondary" : "ghost"} aria-pressed={tab === value} onClick={() => setTab(value)}>{value === "overdue" ? "Overdue" : value === "today" ? "Today" : "Upcoming & undated"}</Button>)}</div>
          <DashboardTasks tasks={tasks} today={data.today} empty={tab === "today" ? "Nothing assigned to you is due today. Check upcoming tasks or enjoy the breathing room." : tab === "overdue" ? "No overdue tasks assigned to you." : "No upcoming or undated tasks assigned to you."} />
        </Panel>
        <Panel title="Needs attention" description="Overdue, urgent, or blocked · up to 6 tasks">
          <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-danger/10 text-danger px-2 py-1">{data.summary.overdue} overdue</span><span className="rounded-lg bg-danger/10 text-danger px-2 py-1">{data.summary.urgent} urgent</span><span className="rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1">{data.summary.blocked} blocked</span></div>
          <DashboardTasks tasks={data.attention} today={data.today} empty="All clear. No overdue, urgent, or visibly blocked tasks." />
        </Panel>
      </div>
      <section aria-label="Project progress" className="space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2"><h2 className="text-lg font-semibold">Project progress</h2><span className="text-xs text-muted-foreground">Completed tasks / total · archived work excluded</span></div>
        {!data.projects.length && <Empty>No active projects yet. Create one from the sidebar, or ask a workspace administrator for access.</Empty>}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{data.projects.map(project => {
          const percent = project.total ? Math.round(project.completed / project.total * 100) : 0;
          const original = projectRecords.find(p => p.id === project.id);
          return <Card key={project.id} className="p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-center gap-2"><span className="text-xs text-muted-foreground font-mono">{project.identifier}</span>{canManage && original && <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={"Edit project: " + project.name} onClick={() => setEditing(original)}><Edit2 size={14} /></Button><Button size="icon" variant="ghost" className="text-danger hover:text-danger" aria-label={"Delete project: " + project.name} onClick={() => setDeleting(original)}><Trash2 size={14} /></Button></div>}</div>
            <Link to={"/p/" + project.id + "/board"} className="flex gap-2 items-start justify-between font-semibold hover:text-primary"><span className="flex min-w-0 gap-2"><span className="size-2 rounded-full mt-2 shrink-0" style={{ background: project.color || "var(--color-primary)" }} /><span className="break-words" dir="auto">{project.name}</span></span><ArrowUpRight size={17} className="shrink-0 mt-1" /></Link>
            <div><div className="flex justify-between gap-2 text-xs mb-2"><span className="text-muted-foreground">{project.completed} / {project.total} tasks</span><span>{percent}%</span></div><div role="progressbar" aria-label={project.name + " completion"} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: percent + "%" }} /></div></div>
            <div className="flex flex-wrap gap-2 justify-between text-xs text-muted-foreground"><span className={project.overdue ? "text-danger" : ""}>{project.overdue ? project.overdue + " overdue" : "No overdue tasks"}</span><span>{project.next_due ? "Next due " + dueLabel(project.next_due) : "No upcoming deadline"}</span></div>
          </Card>;
        })}</div>
      </section>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Upcoming deadlines" description="Today and the next 6 days · up to 6 tasks" action={<CalendarDays size={18} className="text-primary" />}><DashboardTasks tasks={data.deadlines} today={data.today} empty="No open tasks have deadlines in the next seven days." /></Panel>
        <Panel title="Pinned notes" description="Shared in this workspace and private to you · 6 most recent" action={<Link to={notesPath} className="text-xs text-primary hover:underline">Open notes →</Link>}>
          {!data.notes.length && <Empty>Pin a note in Notes to keep important context here.</Empty>}
          <div className="divide-y divide-border/60">{data.notes.map(note => <Link key={note.id} to={notesPath + "?" + new URLSearchParams({ scope: note.workspace_id ? "workspace" : "personal", note: note.id })} className="flex items-start gap-3 py-3 px-2 rounded-xl hover:bg-muted/60 group"><span className="text-primary mt-1">{note.workspace_id ? <Users size={16} aria-label="Workspace note" /> : <Lock size={16} aria-label="Personal note" />}</span><span className="min-w-0 flex-1"><span className="text-sm font-medium block break-words group-hover:text-primary" dir="auto">{note.title}</span><span className="text-xs text-muted-foreground">{note.workspace_id ? "Shared workspace note" : "Personal · only you"}</span></span><Pin size={13} className="text-muted-foreground mt-1" /></Link>)}</div>
        </Panel>
      </div>
      <Panel title="Recent task activity" description="Latest 8 visible task events in this workspace" action={<History size={18} className="text-primary" />}>
        {!data.activity.length && <Empty>No task activity yet. Updates from your team will appear here.</Empty>}
        <div className="divide-y divide-border/60">{data.activity.map(event => <button key={event.id} type="button" onClick={() => openTask(event.card_id)} className="flex w-full text-start items-start gap-3 py-3 px-2 rounded-xl hover:bg-muted/60"><span className="mt-1 rounded-full bg-primary/10 p-2 text-primary"><History size={14} /></span><span className="min-w-0 flex-1"><span className="block text-sm break-words"><strong>{event.actor_name}</strong> {activityLabel(event.action)} <span dir="auto">{event.task_title}</span></span><span className="text-xs text-muted-foreground">{event.project_name}</span></span><time dateTime={event.created_at} title={new Date(event.created_at).toLocaleString()} className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(event.created_at)}</time></button>)}</div>
      </Panel>
    </>}
    {create && data && !!writable.length && <QuickTaskModal projects={writable} onClose={() => setCreate(false)} />}
    {editing && data && canManage && <EditProjectModal isOpen onClose={() => setEditing(null)} project={editing} />}
    {deleting && data && canManage && <ConfirmModal isOpen onClose={() => { if (!remove.isPending) setDeleting(null); }} title={`Delete "${deleting.name}"?`} description="This permanently deletes the project and its tasks, columns, and history. This action cannot be undone." confirmLabel="Delete project" isDestructive isLoading={remove.isPending} error={remove.error ? apiError(remove.error) : undefined} onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => { setDeleting(null); void query.refetch(); } })} />}
  </div>;
}
