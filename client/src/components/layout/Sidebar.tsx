import { CustomSelect } from "@/components/ui/CustomSelect";
import { StarredBoards } from "@/features/views/StarredBoards";
import { useState, useEffect } from "react";
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
  X,
  Zap,
  BarChart3,
  Layers,
  Shield,
} from "lucide-react";
import { NexaLogo } from "@/components/common/NexaLogo";
import { useUiStore } from "@/stores/ui.store";
import { useActiveWorkspace } from "@/hooks/workspace/useActiveWorkspace";
import { useProjects } from "@/hooks/project/useProjects";
import { Modal, Button, Input, Textarea } from "@/components/ui";
import { useCreateProject } from "@/hooks/project/useCreateProject";
import { useCreateWorkspace } from "@/hooks/workspace/useCreateWorkspace";

export const Sidebar = () => {
  const { projectId } = useParams<{
    projectId?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      useUiStore.getState().setSidebarOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (
        typeof window !== "undefined" &&
        window.innerWidth < 768 &&
        useUiStore.getState().sidebarOpen
      ) {
        useUiStore.getState().setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {workspaces,currentWorkspace,selectWorkspace}=useActiveWorkspace();

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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setProjectError("Project name is required");
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
      setWorkspaceError("Workspace name is required");
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

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        onClick={() => useUiStore.getState().setSidebarOpen(false)}
      />

      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0a1518] border-r border-slate-200/80 dark:border-[#183035] flex flex-col shrink-0 h-screen select-none transition-all duration-300 shadow-2xl md:shadow-none md:static md:z-auto">
        {/* Workspace selector / App branding */}
        <div className="p-4 border-b border-slate-100 dark:border-[#183035] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <NexaLogo size={32} className="shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                <span>{currentWorkspace?.name || "NEXA"}</span>
              </h2>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold tracking-wider uppercase block">
                Mission Control
              </span>
            </div>
          </div>
          <button
            onClick={() => useUiStore.getState().setSidebarOpen(false)}
            title="Close sidebar"
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#132428] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-sidebar">
          {/* Workspace Switcher & Hub */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Workspace
              </span>
              <button
                onClick={() => {
                  setWorkspaceError(null);
                  setCreateWorkspaceOpen(true);
                }}
                title="Create Workspace"
                className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#132428] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <CustomSelect
              value={currentWorkspace?.id}
              options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
              onChange={(id) => {selectWorkspace(id);navigate(`/w/${id}`);}}
              placeholder="Select workspace…"
              size="sm"
            />

            <div className="pt-1 space-y-0.5">
              <NavLink
                to={`/w/${currentWorkspace?.id}`}
                end
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="truncate">Workspace Overview</span>
              </NavLink>

              <NavLink
                to={`/w/${currentWorkspace?.id}/work`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
                  }`
                }
              >
                <Inbox className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="truncate">Planner & Work Hub</span>
              </NavLink>
            </div>
          </div>

          <StarredBoards projectId={currentProject?.id || ""} />

          {/* Projects list */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Projects
              </span>
              <button
                onClick={() => {
                  setProjectError(null);
                  setCreateProjectOpen(true);
                }}
                className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#132428] transition-colors"
                title="Create Project"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 italic">
                  No projects yet
                </div>
              ) : (
                projects.map((proj) => {
                  const isActive = currentProject?.id === proj.id;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => navigate(`/p/${proj.id}/board`)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                        isActive
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25 shadow-2xs"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: proj.color || "#2dd4bf" }}
                        />
                        <span className="truncate">{proj.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0 uppercase">
                        {proj.identifier}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Current project view tabs */}
          {currentProject && (
            <div className="space-y-4">
              <div>
                <div className="px-2 mb-2">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Views ({currentProject.identifier})
                  </span>
                </div>

                <div className="space-y-0.5">
                  <NavLink
                    to={`/p/${currentProject.id}/board`}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
                      }`
                    }
                  >
                    <Kanban className="w-4 h-4 text-teal-500 shrink-0" />
                    <span className="truncate">Kanban Board</span>
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/backlog`}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
                      }`
                    }
                  >
                    <ListTodo className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate">Backlog & Sprints</span>
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/timeline`}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
                      }`
                    }
                  >
                    <GanttChartSquare className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">Timeline</span>
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/calendar`}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
                      }`
                    }
                  >
                    <CalendarDays className="w-4 h-4 text-sky-500 shrink-0" />
                    <span className="truncate">Calendar</span>
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/list`}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
                      }`
                    }
                  >
                    <TableProperties className="w-4 h-4 text-teal-400 shrink-0" />
                    <span className="truncate">List View</span>
                  </NavLink>
                </div>
              </div>

              {/* Enterprise Features */}
              <div>
                <div className="px-2 mb-2">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Enterprise & Ops
                  </span>
                </div>
                <div className="space-y-0.5">
                  <NavLink
                    to={`/p/${currentProject.id}/insights`}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
                      }`
                    }
                  >
                    <BarChart3 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="truncate">Insights</span>
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/automation`}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
                      }`
                    }
                  >
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">Automation</span>
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/service-desk`}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
                      }`
                    }
                  >
                    <Layers className="w-4 h-4 text-cyan-500 shrink-0" />
                    <span className="truncate">Service Desk</span>
                  </NavLink>

                  <NavLink
                    to={`/p/${currentProject.id}/governance`}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
                      }`
                    }
                  >
                    <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate">Project Governance</span>
                  </NavLink>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Settings Link */}
        <div className="p-3 border-t border-slate-100 dark:border-[#183035]">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/25 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#132428] hover:text-slate-900 dark:hover:text-slate-200"
              }`
            }
          >
            <Settings className="w-4 h-4 text-teal-500 shrink-0" />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Create Project Modal with custom error validation */}
      <Modal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        title="Create New Project"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            placeholder="e.g. Website Redesign"
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
            label="Identifier (Key)"
            placeholder="e.g. WEB"
            value={newProjectIdentifier}
            onChange={(e) =>
              setNewProjectIdentifier(e.target.value.toUpperCase())
            }
          />
          <CustomSelect
            label="Visibility"
            value={newProjectVisibility}
            options={[
              { value: "public", label: "Workspace-visible" },
              { value: "private", label: "Private" },
            ]}
            onChange={(v) => setNewProjectVisibility(v as "public" | "private")}
          />
          <Textarea
            label="Description (Optional)"
            placeholder="What is this project about?"
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
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateProject}
              isLoading={createProjectMutation.isPending}
            >
              Create Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Workspace Modal with custom error validation */}
      <Modal
        isOpen={createWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
        title="Create New Workspace"
      >
        <div className="space-y-4">
          <Input
            label="Workspace Name"
            placeholder="e.g. Acme Corporation"
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
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateWorkspace}
              isLoading={createWorkspaceMutation.isPending}
            >
              Create Workspace
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
