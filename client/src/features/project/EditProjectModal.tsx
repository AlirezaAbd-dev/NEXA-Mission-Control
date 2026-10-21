import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUpdateProject } from "@/hooks/project/useUpdateProject";
import type { Project } from "@/types";

const PRESET_COLORS = [
  "#2dd4bf", // Teal
  "#0ea5e9", // Sky
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#f97316", // Orange
  "#eab308", // Amber
  "#10b981", // Emerald
];

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [color, setColor] = useState(project.color || "#2dd4bf");
  const [error, setError] = useState<string | null>(null);

  const updateProject = useUpdateProject(project.id, project.workspace_id);

  // Sync state when project changes or opens
  React.useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setDescription(project.description || "");
      setColor(project.color || "#2dd4bf");
      setError(null);
    }
  }, [isOpen, project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Project name cannot be empty");
      return;
    }
    setError(null);

    updateProject.mutate(
      {
        name: trimmed,
        description: description.trim() || undefined,
        color,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err: any) => {
          setError(
            err?.response?.data?.error?.message ||
              err?.message ||
              "Failed to update project"
          );
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Project"
      description={`Update settings for project (${project.identifier})`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Project Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mobile App"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional project purpose, goals, or notes..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-[#183035] bg-white dark:bg-[#070e10] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Accent Color
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                  color === c
                    ? "ring-2 ring-offset-2 ring-teal-500 scale-110"
                    : "hover:scale-105 opacity-80 hover:opacity-100"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#183035]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={updateProject.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={updateProject.isPending}
            disabled={!name.trim()}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
