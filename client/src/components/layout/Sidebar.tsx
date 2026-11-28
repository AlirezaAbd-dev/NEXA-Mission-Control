import { normalizeSearch, tr, useUiLocale } from "@/i18n";
import { useState, useEffect } from "react";
import { Link, NavLink, useParams, useNavigate, useLocation } from "react-router";
import { Plus, Settings, LayoutDashboard, Inbox, NotebookPen, PanelLeftClose, MoreHorizontal, Star, FolderOpen } from "lucide-react";
import { NexaLogo } from "@/components/common/NexaLogo";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";
import { NativeBottomSheet } from "@/components/ui/NativeBottomSheet";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { useUiStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { useActiveWorkspace } from "@/hooks/workspace/useActiveWorkspace";
import { useProjects } from "@/hooks/project/useProjects";
import { useCreateProject } from "@/hooks/project/useCreateProject";
import { useCreateWorkspace } from "@/hooks/workspace/useCreateWorkspace";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import { readWorkView, readRecentProjects, rememberProject } from "@/lib/projectNavigation";
import { apiError } from "@/lib/apiError";
import { Modal, Button, Input, Textarea, CustomSelect, Dropdown } from "@/components/ui";

const navStyle = ({ isActive }: { isActive: boolean }) =>
  "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary " +
  (isActive ? "bg-primary/10 text-primary font-semibold" : "text-foreground/75 hover:bg-muted hover:text-foreground");
export const Sidebar = () => {
  useUiLocale();
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMobileViewport("(max-width: 1023px)");
  const sidebarOpen = useUiStore(s => s.sidebarOpen);
  const collapsed = useUiStore(s => s.sidebarCollapsed);
  const toggleCollapsed = useUiStore(s => s.toggleSidebarCollapsed);
  const closeSidebar = () => useUiStore.getState().setSidebarOpen(false);
  const userId = useAuthStore(s => s.user?.id);
  const { workspaces, currentWorkspace, selectWorkspace } = useActiveWorkspace();
  const projectsQuery = useProjects(currentWorkspace?.id);
  const projects = projectsQuery.data || [];
  const { data: starred = [] } = useEnterpriseResource<{ id: string; name: string }[]>(projects[0]?.id || "", "starred");
  const starredIds = new Set(starred.map(project => project.id));
  const recent = readRecentProjects(userId, currentWorkspace?.id);
  const rank = (id: string) => recent.includes(id) ? recent.indexOf(id) : 999;
  const ordered = [...projects].sort((a, b) => Number(starredIds.has(b.id)) - Number(starredIds.has(a.id)) || rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
  const visibleProjects = ordered.slice(0, 6);
  const currentProject = projects.find(project => project.id === projectId);
  if (currentProject && !visibleProjects.some(project => project.id === currentProject.id)) visibleProjects.push(currentProject);
  useEffect(() => { if (currentProject) rememberProject(userId, currentWorkspace?.id, currentProject.id); }, [userId, currentWorkspace?.id, currentProject]);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  useEffect(() => { if (isMobile) useUiStore.getState().setSidebarOpen(false); }, [location.pathname, isMobile]);

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectIdentifier, setNewProjectIdentifier] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectVisibility, setNewProjectVisibility] = useState<
    "public" | "private"
  >("public");
  const [projectError, setProjectError] = useState<string | null>(null);

  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const createProjectMutation = useCreateProject(currentWorkspace?.id || "");
  const createWorkspaceMutation = useCreateWorkspace();

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setProjectError(tr("Project name is required"));
      return;
    }
    setProjectError(null);

    const identifier =
      newProjectIdentifier.trim() || newProjectName.slice(0, 3).toUpperCase();
    try {
      await createProjectMutation.mutateAsync({
        name: newProjectName.trim(),
        identifier,
        description: newProjectDesc.trim() || undefined,
        visibility: newProjectVisibility,
      });
      setCreateProjectOpen(false);
      setNewProjectName("");
      setNewProjectIdentifier("");
      setNewProjectDesc("");
      setNewProjectVisibility("public");
    } catch (err: any) {
      setProjectError(
        apiError(err),
      );
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      setWorkspaceError(tr("Workspace name is required"));
      return;
    }
    setWorkspaceError(null);

    try {
      const ws = await createWorkspaceMutation.mutateAsync({
        name: newWorkspaceName.trim(),
      });
      setCreateWorkspaceOpen(false);
      setNewWorkspaceName("");
      selectWorkspace(ws.id);
      navigate(`/w/${ws.id}`);
    } catch (err: any) {
      setWorkspaceError(
        apiError(err),
      );
    }
  };

  const renderProjectLink = (project: (typeof projects)[number]) => <Link key={project.id} onClick={() => { setBrowseOpen(false); if (isMobile) closeSidebar(); }} to={`/p/${project.id}/${readWorkView(userId, project.id)}`}
            aria-current={project.id === projectId ? "page" : undefined}
            className={navStyle({ isActive: project.id === projectId })}>
            {starredIds.has(project.id) ? <Star size={16} className="shrink-0 fill-current text-primary" aria-label={tr("Starred project")} /> : <FolderOpen size={17} className="shrink-0" />}
            <span dir="auto" className="truncate">{project.name}</span>
          </Link>;
  const navigation = <>
    <header className="shrink-0 border-b border-border p-3 space-y-3">
      <div className="hidden lg:flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0"><NexaLogo size={25} /><span className="font-semibold text-sm truncate">{tr("Mission Control")}</span></div>
        <Button variant="ghost" size="icon" aria-label={tr("Collapse sidebar")} onClick={toggleCollapsed} className="min-h-11 min-w-11"><DirectionalIcon icon={PanelLeftClose} size={17} /></Button>
      </div>
      <div className="flex items-center gap-1">
        <CustomSelect className="min-w-0 flex-1" searchable value={currentWorkspace?.id}
          options={workspaces.map(workspace => ({ value: workspace.id, label: workspace.name }))}
          ariaLabel={tr("Switch workspace")} placeholder={tr("Select workspace…")}
          onChange={id => { selectWorkspace(id); navigate(`/w/${id}`); if (isMobile) closeSidebar(); }} />
        <Dropdown ariaLabel={tr("Workspace actions")} trigger={<MoreHorizontal size={18} />}
          items={[{ id: "new-workspace", label: tr("Create Workspace"), icon: <Plus size={16} />, onClick: () => { setWorkspaceError(null); setCreateWorkspaceOpen(true); } }]} />
      </div>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 space-y-6">
      <nav onClick={() => { if (isMobile) closeSidebar(); }} aria-label={tr("Workspace navigation")} className="space-y-1">
        <NavLink to={currentWorkspace ? `/w/${currentWorkspace.id}` : "/"} end className={navStyle}><LayoutDashboard size={18} /><span>{tr("Overview")}</span></NavLink>
        {currentWorkspace && <NavLink to={`/w/${currentWorkspace.id}/work`} className={navStyle}><Inbox size={18} /><span>{tr("Work")}</span></NavLink>}
        <NavLink to={currentWorkspace ? `/w/${currentWorkspace.id}/notes` : "/notes"} className={navStyle}><NotebookPen size={18} /><span>{tr("Notes")}</span></NavLink>
      </nav>
      <section aria-label={tr("Projects")}>
        <div className="flex items-center justify-between gap-2 ps-3 mb-1">
          <h2 className="text-xs font-semibold text-foreground/75">{tr("Projects")}</h2>
          <Button variant="ghost" size="icon" disabled={!currentWorkspace} aria-label={tr("Create Project")} onClick={() => { setProjectError(null); setCreateProjectOpen(true); }} className="min-h-11 min-w-11"><Plus size={17} /></Button>
        </div>
        {projectsQuery.isLoading && <div role="status" className="space-y-2 px-3"><span className="sr-only">{tr("Loading projects…")}</span>{[0, 1, 2].map(i => <div key={i} className="h-11 rounded-xl bg-muted animate-pulse" />)}</div>}
        {projectsQuery.error && <div role="alert" className="px-3 text-sm space-y-2"><p>{apiError(projectsQuery.error)}</p><Button variant="outline" size="sm" onClick={() => void projectsQuery.refetch()}>{tr("Retry")}</Button></div>}
        {!projectsQuery.isLoading && !projectsQuery.error && !projects.length && <p className="px-3 py-2 text-sm text-foreground/75">{tr("No projects yet")}</p>}
        <nav aria-label={tr("Project navigation")} className="space-y-1">
          {visibleProjects.map(renderProjectLink)}
        </nav>
        {!!projects.length && <Button variant="ghost" size="sm" onClick={() => { setProjectSearch(""); setBrowseOpen(true); }} className="w-full min-h-11 justify-start mt-1 text-foreground/75">{tr("Browse projects…")}</Button>}
      </section>
    </div>
    <footer className="shrink-0 border-t border-border p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
      <NavLink to="/settings" onClick={() => { if (isMobile) closeSidebar(); }} className={navStyle}><Settings size={18} /><span>{tr("Settings")}</span></NavLink>
    </footer>
  </>;
  return <>
    {isMobile ? (
      sidebarOpen && <NativeBottomSheet open onClose={closeSidebar} title={tr("Navigation")} contentClassName="p-0 pb-0 flex flex-col h-[75dvh]">{navigation}</NativeBottomSheet>
    ) : (
      <aside data-nexa-sidebar="" aria-label={tr("Main navigation")} className="fixed inset-y-0 start-0 z-40 hidden min-h-0 flex-col overflow-hidden text-foreground lg:flex">
        {collapsed ? (
          <nav aria-label={tr("Workspace navigation")} className="flex h-full flex-col items-center gap-2 p-3">
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={toggleCollapsed} aria-label={tr("Expand sidebar")} title={tr("Expand sidebar")}><NexaLogo size={25} /></Button>
            <NavLink to={currentWorkspace ? `/w/${currentWorkspace.id}` : "/"} end className={navStyle} title={tr("Overview")} aria-label={tr("Overview")}><LayoutDashboard size={18} /></NavLink>
            {currentWorkspace && <NavLink to={`/w/${currentWorkspace.id}/work`} className={navStyle} title={tr("Work")} aria-label={tr("Work")}><Inbox size={18} /></NavLink>}
            <NavLink to={currentWorkspace ? `/w/${currentWorkspace.id}/notes` : "/notes"} className={navStyle} title={tr("Notes")} aria-label={tr("Notes")}><NotebookPen size={18} /></NavLink>
            {!!projects.length && <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={tr("Browse projects")} title={tr("Browse projects")} onClick={() => { setProjectSearch(""); setBrowseOpen(true); }}><FolderOpen size={18} /></Button>}
            <div className="mt-auto"><NavLink to="/settings" className={navStyle} title={tr("Settings")} aria-label={tr("Settings")}><Settings size={18} /></NavLink></div>
          </nav>
        ) : navigation}
      </aside>
    )}
    <Modal isOpen={browseOpen} onClose={() => setBrowseOpen(false)} title={tr("Browse projects")} description={tr("Search all projects in this workspace.")}>
      <Input aria-label={tr("Find a project")} placeholder={tr("Find a project")} value={projectSearch} onChange={event => setProjectSearch(event.target.value)} autoFocus />
      <nav aria-label={tr("Projects")} className="mt-3 max-h-[55dvh] overflow-y-auto overscroll-y-contain space-y-1">
        {ordered.filter(project => normalizeSearch(project.name + " " + project.identifier).includes(normalizeSearch(projectSearch))).map(renderProjectLink)}
      </nav>
      {!ordered.some(project => normalizeSearch(project.name + " " + project.identifier).includes(normalizeSearch(projectSearch))) && <p className="py-6 text-center text-sm text-foreground/75">{tr("No projects match your search.")}</p>}
    </Modal>
      {/* Create Project Modal with custom error validation */}
      <Modal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        title={tr("Create New Project")}
      >
        <div className="space-y-4">
          <Input
            label={tr("Project Name")}
            placeholder={tr("e.g. Website Redesign")}
            value={newProjectName}
            error={projectError || undefined}
            onChange={(e) => {
              setNewProjectName(e.target.value);
              if (projectError) setProjectError(null);
              if (!newProjectIdentifier) {
                setNewProjectIdentifier(
                  e.target.value.slice(0, 4).toUpperCase(),
                );
              }
            }}
          />
          <Input
            label={tr("Identifier (Key)")}
            placeholder={tr("e.g. WEB")}
            value={newProjectIdentifier}
            onChange={(e) =>
              setNewProjectIdentifier(e.target.value.toUpperCase())
            }
          />
          <CustomSelect
            label={tr("Visibility")}
            value={newProjectVisibility}
            options={[
              { value: "public", label: tr("Workspace-visible") },
              { value: "private", label: tr("Private") },
            ]}
            onChange={(v) => setNewProjectVisibility(v as "public" | "private")}
          />
          <Textarea
            label={tr("Description (Optional)")}
            placeholder={tr("What is this project about?")}
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateProjectOpen(false)}
            >{tr("Cancel")}</Button>
            <Button
              size="sm"
              onClick={handleCreateProject}
              isLoading={createProjectMutation.isPending}
            >{tr("Create Project")}</Button>
          </div>
        </div>
      </Modal>

      {/* Create Workspace Modal with custom error validation */}
      <Modal
        isOpen={createWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
        title={tr("Create New Workspace")}
      >
        <div className="space-y-4">
          <Input
            label={tr("Workspace Name")}
            placeholder={tr("e.g. Acme Corporation")}
            value={newWorkspaceName}
            error={workspaceError || undefined}
            onChange={(e) => {
              setNewWorkspaceName(e.target.value);
              if (workspaceError) setWorkspaceError(null);
            }}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateWorkspaceOpen(false)}
            >{tr("Cancel")}</Button>
            <Button
              size="sm"
              onClick={handleCreateWorkspace}
              isLoading={createWorkspaceMutation.isPending}
            >{tr("Create Workspace")}</Button>
          </div>
        </div>
      </Modal>
  </>;
};
