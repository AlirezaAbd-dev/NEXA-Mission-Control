import { useWorkspaceMetrics } from "@/hooks/enterprise/useWorkspaceMetrics";
import React from "react";
import { Link } from "react-router";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { useActiveWorkspace } from "@/hooks/workspace/useActiveWorkspace";
import { useProjects } from "@/hooks/project/useProjects";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  FolderKanban,
  Edit2,
  Trash2,
} from "lucide-react";
import { EditProjectModal } from "@/features/project/EditProjectModal";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useDeleteProject } from "@/hooks/project/useDeleteProject";
import type { Project } from "@/types";

export const DashboardPage: React.FC = () => {
  const { data: user } = useCurrentUser();
  const { workspaces, currentWorkspaceId, currentWorkspace } = useActiveWorkspace();
  const { data: metrics } = useWorkspaceMetrics(currentWorkspaceId);
  const { data: projects = [], isLoading: isProjectsLoading } =
    useProjects(currentWorkspaceId);

  const [projectToEdit, setProjectToEdit] = React.useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);

  const deleteProject = useDeleteProject(currentWorkspaceId);
  const role = currentWorkspace?.user_role || "";
  const canManageProjects = ["owner", "admin"].includes(role);

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Welcome banner */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Welcome back, {user?.display_name || user?.username || "Commander"}
        </h1>
        <p className="text-slate-500 text-sm">
          Here is what is happening across your mission workspaces today.
        </p>
      </div>

      {/* KPI metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Workspaces
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {workspaces.length}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-500">
              <FolderKanban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Projects
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {projects.length}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Pending Actions
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {metrics?.pending ?? 0}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Urgent Tasks
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {metrics?.urgent ?? 0}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Active Projects
          </h2>
        </div>

        {isProjectsLoading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-slate-500 border border-dashed rounded-xl">
            No projects found in this workspace. Create one from the sidebar!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <div key={proj.id} className="relative group">
                <Link
                  to={`/p/${proj.id}/board`}
                  className="block h-full"
                >
                  <Card className="hover:border-teal-500/50 transition-all hover:shadow-md h-full">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: proj.color || "#2dd4bf" }}
                          />
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-muted text-slate-500 uppercase">
                            {proj.identifier}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {canManageProjects && (
                            <div
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mr-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setProjectToEdit(proj);
                                }}
                                className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-md hover:bg-slate-100 dark:hover:bg-[#132428] transition-colors"
                                title="Edit project"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setProjectToDelete(proj);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-[#132428] transition-colors"
                                title="Delete project"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors" />
                        </div>
                      </div>
                      <CardTitle className="text-base group-hover:text-teal-500 transition-colors pt-2">
                        {proj.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {proj.description || "No description provided."}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      {projectToEdit && (
        <EditProjectModal
          isOpen={!!projectToEdit}
          onClose={() => setProjectToEdit(null)}
          project={projectToEdit}
        />
      )}

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <ConfirmModal
          isOpen={!!projectToDelete}
          onClose={() => setProjectToDelete(null)}
          title={`Delete "${projectToDelete.name}"?`}
          description={`Are you sure you want to permanently delete this project (${projectToDelete.identifier}) and all of its tasks, columns, and history? This action cannot be undone.`}
          confirmLabel="Delete Project"
          isDestructive
          isLoading={deleteProject.isPending}
          onConfirm={() => {
            if (!projectToDelete) return;
            deleteProject.mutate(projectToDelete.id, {
              onSuccess: () => setProjectToDelete(null),
            });
          }}
        />
      )}
    </div>
  );
};
