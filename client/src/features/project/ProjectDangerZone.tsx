import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Edit2, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { EditProjectModal } from "./EditProjectModal";
import { useProject } from "@/hooks/project/useProject";
import { useDeleteProject } from "@/hooks/project/useDeleteProject";
import { useWorkspaces } from "@/hooks/workspace/useWorkspaces";

interface ProjectDangerZoneProps {
  projectId: string;
}

export const ProjectDangerZone: React.FC<ProjectDangerZoneProps> = ({
  projectId,
}) => {
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);
  const { data: workspaces = [] } = useWorkspaces();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteProject = useDeleteProject(project?.workspace_id);

  const currentWorkspace = workspaces.find((w) => w.id === project?.workspace_id);
  const role = currentWorkspace?.user_role || "";
  const canEdit = ["owner", "admin"].includes(role);
  const canDelete = ["owner", "admin"].includes(role);

  if (!project) return null;

  const handleDelete = () => {
    setDeleteError(null);
    deleteProject.mutate(projectId, {
      onSuccess: () => {
        setDeleteOpen(false);
        navigate(`/w/${project.workspace_id}`);
      },
      onError: (err: any) => {
        setDeleteError(
          err?.response?.data?.error?.message ||
            err?.message ||
            "Failed to delete project"
        );
      },
    });
  };

  return (
    <>
      <section className="p-5 border rounded-xl space-y-4 border-slate-200 dark:border-[#183035] bg-white dark:bg-[#0a1518]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: project.color || "#2dd4bf" }}
              />
              Project Details & Actions
            </h2>
            <p className="text-sm text-slate-500">
              Manage project name, description, accent color, or permanently delete this project.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-teal-500" />
                <span>Edit Project</span>
              </Button>
            )}

            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Project</span>
              </Button>
            )}
          </div>
        </div>

        {!canEdit && (
          <div className="text-xs text-slate-400 italic">
            You have viewer or member permissions. Only workspace owners and admins can edit or delete this project.
          </div>
        )}
      </section>

      {/* Edit Modal */}
      {canEdit && (
        <EditProjectModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
        />
      )}

      {/* Delete Confirmation Modal */}
      {canDelete && (
        <ConfirmModal
          isOpen={deleteOpen}
          onClose={() => {
            setDeleteOpen(false);
            setDeleteError(null);
          }}
          title={`Delete "${project.name}"?`}
          description={
            deleteError ||
            `Are you sure you want to permanently delete this project (${project.identifier}) and all of its tasks, columns, and history? This action cannot be undone.`
          }
          confirmLabel="Delete Project"
          isDestructive
          isLoading={deleteProject.isPending}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
};
