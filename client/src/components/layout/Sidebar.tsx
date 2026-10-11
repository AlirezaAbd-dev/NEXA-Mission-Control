import { useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router';
import {
  Kanban,
  ListTodo,
  GanttChartSquare,
  CalendarDays,
  TableProperties,
  Plus,
  FolderKanban,
  Settings,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';
import { useWorkspaces } from '@/hooks/workspace/useWorkspaces';
import { useProjects } from '@/hooks/workspace/../project/useProjects';
import { Modal, Button, Input, Textarea } from '@/components/ui';
import { useCreateProject } from '@/hooks/project/useCreateProject';
import { useCreateWorkspace } from '@/hooks/workspace/useCreateWorkspace';

export const Sidebar = () => {
  const { workspaceId, projectId } = useParams<{ workspaceId?: string; projectId?: string }>();
  const navigate = useNavigate();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  const { data: workspaces = [] } = useWorkspaces();
  const currentWorkspace = workspaces.find((w) => w.id === workspaceId) || workspaces[0];

  const { data: projects = [] } = useProjects(currentWorkspace?.id);
  const currentProject = projects.find((p) => p.id === projectId) || projects[0];

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectIdentifier, setNewProjectIdentifier] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const createProjectMutation = useCreateProject(currentWorkspace?.id || '');
  const createWorkspaceMutation = useCreateWorkspace();

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const identifier = newProjectIdentifier.trim() || newProjectName.slice(0, 3).toUpperCase();
    await createProjectMutation.mutateAsync({
      name: newProjectName,
      identifier,
      description: newProjectDesc,
    });
    setCreateProjectOpen(false);
    setNewProjectName('');
    setNewProjectIdentifier('');
    setNewProjectDesc('');
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    const ws = await createWorkspaceMutation.mutateAsync({ name: newWorkspaceName });
    setCreateWorkspaceOpen(false);
    setNewWorkspaceName('');
    navigate(`/w/${ws.id}`);
  };

  if (!sidebarOpen) return null;

  return (
    <>
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 h-screen select-none">
        {/* Workspace selector */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              {currentWorkspace?.name?.[0]?.toUpperCase() || 'T'}
            </div>
            <div className="truncate">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentWorkspace?.name || 'TaskFlow'}
              </h2>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {currentWorkspace?.user_role || 'Workspace'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setCreateWorkspaceOpen(true)}
            title="Create Workspace"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Project navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Projects list */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Projects
              </span>
              <button
                onClick={() => setCreateProjectOpen(true)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
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
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color || '#6366f1' }}
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
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Views ({currentProject.identifier})
                </span>
              </div>

              <div className="space-y-0.5">
                <NavLink
                  to={`/p/${currentProject.id}/board`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`
                  }
                >
                  <Kanban className="w-4 h-4 text-indigo-500" />
                  <span>Kanban Board</span>
                </NavLink>

                <NavLink
                  to={`/p/${currentProject.id}/backlog`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`
                  }
                >
                  <ListTodo className="w-4 h-4 text-emerald-500" />
                  <span>Backlog & Sprints</span>
                </NavLink>

                <NavLink
                  to={`/p/${currentProject.id}/timeline`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`
                  }
                >
                  <GanttChartSquare className="w-4 h-4 text-amber-500" />
                  <span>Timeline</span>
                </NavLink>

                <NavLink
                  to={`/p/${currentProject.id}/calendar`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`
                  }
                >
                  <CalendarDays className="w-4 h-4 text-purple-500" />
                  <span>Calendar</span>
                </NavLink>

                <NavLink
                  to={`/p/${currentProject.id}/list`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`
                  }
                >
                  <TableProperties className="w-4 h-4 text-blue-500" />
                  <span>List View</span>
                </NavLink>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Settings Link */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <NavLink
            to="/settings"
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Create Project Modal */}
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
            onChange={(e) => {
              setNewProjectName(e.target.value);
              if (!newProjectIdentifier) {
                setNewProjectIdentifier(e.target.value.slice(0, 4).toUpperCase());
              }
            }}
          />
          <Input
            label="Identifier (Key)"
            placeholder="e.g. WEB"
            value={newProjectIdentifier}
            onChange={(e) => setNewProjectIdentifier(e.target.value.toUpperCase())}
          />
          <Textarea
            label="Description (Optional)"
            placeholder="What is this project about?"
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setCreateProjectOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateProject}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Workspace Modal */}
      <Modal
        isOpen={createWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
        title="Create New Workspace"
      >
        <div className="space-y-4">
          <Input
            label="Workspace Name"
            placeholder="e.g. Acme Corp"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setCreateWorkspaceOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateWorkspace}>
              Create Workspace
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
