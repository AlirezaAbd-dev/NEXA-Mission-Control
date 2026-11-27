import { tr, useUiLocale } from "@/i18n";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { StarredBoards } from "@/features/views/StarredBoards";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useParams, useNavigate, useLocation } from "react-router";
import {
  Kanban,
  ListTodo,
  GanttChartSquare,
  CalendarDays,
  TableProperties,
  Plus,
  Settings,
  LayoutDashboard,
  Inbox,
  NotebookPen,
  X,
  Zap,
  BarChart3,
  Layers,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { NexaLogo } from "@/components/common/NexaLogo";
import { useUiStore } from "@/stores/ui.store";
import { useActiveWorkspace } from "@/hooks/workspace/useActiveWorkspace";
import { useProjects } from "@/hooks/project/useProjects";
import { Modal, Button, Input, Textarea } from "@/components/ui";
import { useCreateProject } from "@/hooks/project/useCreateProject";
import { useCreateWorkspace } from "@/hooks/workspace/useCreateWorkspace";
import { cn } from "@/lib/utils";

export const Sidebar = () => {
  const locale = useUiLocale();
  const isRtl = locale === "fa";
  const { projectId } = useParams<{
    projectId?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);

  const [hoveredTooltip, setHoveredTooltip] = useState<{
    label: string;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      useUiStore.getState().setSidebarOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      useUiStore.getState().setSidebarOpen(mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const { workspaces, currentWorkspace, selectWorkspace } = useActiveWorkspace();
  const { data: projects = [] } = useProjects(currentWorkspace?.id);
  const currentProject =
    projects.find((p) => p.id === projectId) || projects[0];

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

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  const isExpanded = !sidebarCollapsed || (sidebarOpen && !isDesktop);

  useEffect(() => {
    if (isExpanded) setHoveredTooltip(null);
  }, [isExpanded]);

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
        err?.response?.data?.error?.message || "Failed to create project",
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
        err?.response?.data?.error?.message || "Failed to create workspace",
      );
    }
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      !isExpanded && "justify-center px-2",
      isActive
        ? "bg-muted font-semibold text-primary"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
    );

  const tooltipHandlers = (label: string) =>
    isExpanded
      ? {}
      : {
          onMouseEnter: (e: React.MouseEvent<HTMLElement>) =>
            setHoveredTooltip({
              label,
              rect: e.currentTarget.getBoundingClientRect(),
            }),
          onMouseLeave: () => setHoveredTooltip(null),
          onFocus: (e: React.FocusEvent<HTMLElement>) =>
            setHoveredTooltip({
              label,
              rect: e.currentTarget.getBoundingClientRect(),
            }),
          onBlur: () => setHoveredTooltip(null),
        };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-md z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => useUiStore.getState().setSidebarOpen(false)}
        />
      )}

      <aside
        data-nexa-sidebar=""
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-[280px] flex-col bg-sidebar select-none transition-[width,transform] duration-300 motion-reduce:transition-none lg:z-40 max-lg:shadow-2xl",
          sidebarOpen
            ? "translate-x-0"
            : "max-lg:pointer-events-none max-lg:invisible max-lg:-translate-x-full max-lg:rtl:translate-x-full",
        )}
      >
        {/* Brand Header */}
        {isExpanded ? (
          <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-[var(--nexa-divider)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <NexaLogo size={34} className="shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-foreground truncate">
                  {currentWorkspace?.name || "NEXA"}
                </h2>
                <span className="text-[10px] text-primary font-semibold tracking-wider uppercase block">
                  {tr("Mission Control")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-muted/80 hover:text-foreground text-muted-foreground transition-colors lg:flex"
                aria-label={tr("Collapse sidebar")}
                title={tr("Collapse sidebar")}
              >
                <PanelLeftClose className="h-4.5 w-4.5 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => useUiStore.getState().setSidebarOpen(false)}
                title={tr("Close sidebar")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors lg:hidden cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden h-16 shrink-0 items-center justify-center border-b border-[var(--nexa-divider)] lg:flex">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              {...tooltipHandlers(tr("Expand sidebar"))}
              className="group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl transition-all duration-300 hover:bg-muted/80 text-muted-foreground hover:text-primary"
              aria-label={tr("Expand sidebar")}
            >
              <div className="flex items-center justify-center transition-all duration-200 group-hover:scale-75 group-hover:opacity-0 group-hover:invisible pointer-events-none">
                <NexaLogo size={32} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 invisible transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 group-hover:visible pointer-events-none text-primary">
                <PanelLeftOpen className="h-5 w-5 rtl:rotate-180" />
              </div>
            </button>
          </div>
        )}

        {/* Navigation List */}
        <div
          className={cn(
            "flex-1 overflow-y-auto space-y-5 scrollbar-thin",
            isExpanded ? "p-3" : "p-2",
          )}
        >
          {/* Workspace Switcher & Hub */}
          <div className="space-y-2 border-b border-[var(--nexa-divider)] pb-3">
            {isExpanded && (
              <>
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {tr("Workspace")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceError(null);
                      setCreateWorkspaceOpen(true);
                    }}
                    title={tr("Create Workspace")}
                    className="text-muted-foreground hover:text-primary p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <CustomSelect
                  value={currentWorkspace?.id}
                  options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
                  onChange={(id) => {
                    selectWorkspace(id);
                    navigate(`/w/${id}`);
                  }}
                  placeholder={tr("Select workspace…")}
                  size="sm"
                />
              </>
            )}

            <div className="pt-1 space-y-1">
              <NavLink
                to={`/w/${currentWorkspace?.id}`}
                end
                className={navItemClass}
                {...tooltipHandlers(tr("Workspace Overview"))}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {isExpanded && (
                  <span className="truncate">{tr("Workspace Overview")}</span>
                )}
              </NavLink>

              <NavLink
                to={`/w/${currentWorkspace?.id}/work`}
                className={navItemClass}
                {...tooltipHandlers(tr("Planner & Work Hub"))}
              >
                <Inbox className="w-4 h-4 shrink-0" />
                {isExpanded && (
                  <span className="truncate">{tr("Planner & Work Hub")}</span>
                )}
              </NavLink>

              <NavLink
                to={currentWorkspace?.id ? `/w/${currentWorkspace.id}/notes` : "/notes"}
                className={navItemClass}
                {...tooltipHandlers(tr("Notes"))}
              >
                <NotebookPen className="w-4 h-4 shrink-0" />
                {isExpanded && <span className="truncate">{tr("Notes")}</span>}
              </NavLink>
            </div>
          </div>

          {isExpanded && <StarredBoards projectId={currentProject?.id || ""} />}

          {/* Projects list */}
          {isExpanded && (
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {tr("Projects")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setProjectError(null);
                    setCreateProjectOpen(true);
                  }}
                  className="text-muted-foreground hover:text-primary p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  title={tr("Create Project")}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground italic">
                    {tr("No projects yet")}
                  </div>
                ) : (
                  projects.map((proj) => {
                    const isActive = currentProject?.id === proj.id;
                    return (
                      <button
                        type="button"
                        key={proj.id}
                        onClick={() => navigate(`/p/${proj.id}/board`)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-start cursor-pointer",
                          isActive
                            ? "bg-muted text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: proj.color || "var(--color-primary)" }}
                          />
                          <span className="truncate">{proj.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 uppercase">
                          {proj.identifier}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Current project view tabs */}
          {currentProject && (
            <div className="space-y-4">
              <div>
                {isExpanded && (
                  <div className="px-2 mb-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {tr("Views (")}{currentProject.identifier})
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <NavLink
                    to={`/p/${currentProject.id}/board`}
                    className={navItemClass}
                    {...tooltipHandlers(tr("Kanban Board"))}
                  >
                    <Kanban className="w-4 h-4 shrink-0" />
                    {isExpanded && <span className="truncate">{tr("Kanban Board")}</span>}
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/backlog`}
                    className={navItemClass}
                    {...tooltipHandlers(tr("Backlog & Sprints"))}
                  >
                    <ListTodo className="w-4 h-4 shrink-0" />
                    {isExpanded && <span className="truncate">{tr("Backlog & Sprints")}</span>}
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/timeline`}
                    className={navItemClass}
                    {...tooltipHandlers(tr("Timeline"))}
                  >
                    <GanttChartSquare className="w-4 h-4 shrink-0" />
                    {isExpanded && <span className="truncate">{tr("Timeline")}</span>}
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/calendar`}
                    className={navItemClass}
                    {...tooltipHandlers(tr("Calendar"))}
                  >
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    {isExpanded && <span className="truncate">{tr("Calendar")}</span>}
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/list`}
                    className={navItemClass}
                    {...tooltipHandlers(tr("List View"))}
                  >
                    <TableProperties className="w-4 h-4 shrink-0" />
                    {isExpanded && <span className="truncate">{tr("List View")}</span>}
                  </NavLink>
                </div>
              </div>

              {/* Enterprise Features */}
              <div>
                {isExpanded && (
                  <div className="px-2 mb-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {tr("Enterprise & Ops")}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  <NavLink
                    to={`/p/${currentProject.id}/insights`}
                    className={navItemClass}
                    {...tooltipHandlers(tr("Insights"))}
                  >
                    <BarChart3 className="w-4 h-4 shrink-0" />
                    {isExpanded && <span className="truncate">{tr("Insights")}</span>}
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/automation`}
                    className={navItemClass}
                    {...tooltipHandlers(tr("Automation"))}
                  >
                    <Zap className="w-4 h-4 shrink-0" />
                    {isExpanded && <span className="truncate">{tr("Automation")}</span>}
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/service-desk`}
                    className={navItemClass}
                    {...tooltipHandlers(tr("Service Desk"))}
                  >
                    <Layers className="w-4 h-4 shrink-0" />
                    {isExpanded && <span className="truncate">{tr("Service Desk")}</span>}
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/governance`}
                    className={navItemClass}
                    {...tooltipHandlers(tr("Project Governance"))}
                  >
                    <Shield className="w-4 h-4 shrink-0" />
                    {isExpanded && <span className="truncate">{tr("Project Governance")}</span>}
                  </NavLink>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Settings Link */}
        <div className="p-3 border-t border-[var(--nexa-divider)]">
          <NavLink
            to="/settings"
            className={navItemClass}
            {...tooltipHandlers(tr("Settings"))}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {isExpanded && <span>{tr("Settings")}</span>}
          </NavLink>
        </div>
      </aside>

      {/* Collapsed Rail Tooltip */}
      {hoveredTooltip &&
        !isExpanded &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            data-nexa-tooltip-surface=""
            className="pointer-events-none fixed z-[100] w-max rounded-xl px-3 py-1.5 text-xs font-medium"
            style={{
              top: hoveredTooltip.rect.top + hoveredTooltip.rect.height / 2,
              left: isRtl
                ? hoveredTooltip.rect.left - 8
                : hoveredTooltip.rect.right + 8,
              transform: isRtl ? "translate(-100%, -50%)" : "translateY(-50%)",
            }}
          >
            {hoveredTooltip.label}
          </div>,
          document.body,
        )}

      {/* Create Project Modal */}
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
            >
              {tr("Cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleCreateProject}
              isLoading={createProjectMutation.isPending}
            >
              {tr("Create Project")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Workspace Modal */}
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
            >
              {tr("Cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleCreateWorkspace}
              isLoading={createWorkspaceMutation.isPending}
            >
              {tr("Create Workspace")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
