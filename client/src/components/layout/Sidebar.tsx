import { CustomSelect } from "@/components/ui/CustomSelect";
import { useProject } from "@/hooks/project/useProject";
import { StarredBoards } from "@/features/views/StarredBoards";
import { useState } from "react";
import { NavLink, useParams, useNavigate } from "react-router";
import {
  Kanban,
  ListTodo,
  GanttChartSquare,
  CalendarDays,
  TableProperties,
  Plus,
  Settings,
} from "lucide-react";
import { NexaLogo } from "@/components/common/NexaLogo";
import { useUiStore } from "@/stores/ui.store";
import { useWorkspaces } from "@/hooks/workspace/useWorkspaces";
import { useProjects } from "@/hooks/project/useProjects";
import { Modal, Button, Input, Textarea } from "@/components/ui";
import { useCreateProject } from "@/hooks/project/useCreateProject";
import { useCreateWorkspace } from "@/hooks/workspace/useCreateWorkspace";

export const Sidebar = () => {
  const { workspaceId, projectId } = useParams<{
    workspaceId?: string;
    projectId?: string;
  }>();
  const navigate = useNavigate();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  const { data: workspaces = [] } = useWorkspaces();
  const { data: activeProject } = useProject(projectId || "");
  const currentWorkspace =
    workspaces.find(
      (w) => w.id === (workspaceId || activeProject?.workspace_id),
    ) || workspaces[0];

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
      <aside className="w-64 bg-white dark:bg-[#0a1518] border-r border-slate-200/80 dark:border-[#183035] flex flex-col shrink-0 h-screen select-none transition-colors">
        {/* Workspace selector / App branding */}
        <div className="p-4 border-b border-slate-100 dark:border-[#183035] flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <NexaLogo size={32} className="shrink-0" />
            <div className="truncate">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                <span>{currentWorkspace?.name || "NEXA"}</span>
              </h2>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold tracking-wider uppercase">
                Mission Control
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setWorkspaceError(null);
              setCreateWorkspaceOpen(true);
            }}
            title="Create Workspace"
            className="p-1.5 text-slate-400 hover:text-teal-500 rounded-lg hover:bg-slate-100 dark:hover:bg-[#132428] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Project navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <CustomSelect
            value={currentWorkspace?.id}
            options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
            onChange={(id) => navigate(`/w/${id}`)}
          />
          <NavLink
            className="mx-3 p-3 text-sm rounded-xl hover:bg-teal-500/10"
            to={`/w/${currentWorkspace?.id}/work`}
          >
            Inbox, Planner & workspace work
          </NavLink>
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
                className="text-slate-400 hover:text-teal-500 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#132428] transition-colors"
                title="Create Project"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              {projects.map((proj) => {
                const isActive = currentProject?.id === proj.id;
                return (
                  <button
                    key={proj.id}
                    onClick={() => navigate(`/p/${proj.id}/board`)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? "bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/25"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-[#132428]"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color || "#2dd4bf" }}
                    />
                    <span className="truncate">{proj.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current project view tabs */}
          {currentProject && (
            <div>
              <div className="px-2 mb-2">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Views ({currentProject.identifier})
                </span>
              </div>

              <div className="space-y-1">
                <NavLink
                  to={`/p/${currentProject.id}/board`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 dark:bg-[#132428] text-teal-600 dark:text-teal-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#132428]/50"
                    }`
                  }
                >
                  <Kanban className="w-4 h-4 text-teal-500" />
                  <span>Kanban Board</span>
                </NavLink>

                <NavLink
                  to={`/p/${currentProject.id}/backlog`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 dark:bg-[#132428] text-teal-600 dark:text-teal-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#132428]/50"
                    }`
                  }
                >
                  <ListTodo className="w-4 h-4 text-emerald-500" />
                  <span>Backlog & Sprints</span>
                </NavLink>

                <NavLink
                  to={`/p/${currentProject.id}/timeline`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 dark:bg-[#132428] text-teal-600 dark:text-teal-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#132428]/50"
                    }`
                  }
                >
                  <GanttChartSquare className="w-4 h-4 text-amber-500" />
                  <span>Timeline</span>
                </NavLink>

                <NavLink
                  to={`/p/${currentProject.id}/calendar`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 dark:bg-[#132428] text-teal-600 dark:text-teal-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#132428]/50"
                    }`
                  }
                >
                  <CalendarDays className="w-4 h-4 text-teal-500" />
                  <span>Calendar</span>
                </NavLink>

                <NavLink
                  to={`/p/${currentProject.id}/list`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 dark:bg-[#132428] text-teal-600 dark:text-teal-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#132428]/50"
                    }`
                  }
                >
                  <TableProperties className="w-4 h-4 text-teal-400" />
                  <span>List View</span>
                </NavLink>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Settings Link */}
        <div className="p-3 border-t border-slate-100 dark:border-[#183035]">
          <NavLink
            to="/settings"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#132428] transition-colors"
          >
            <Settings className="w-4 h-4 text-teal-500" />
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
