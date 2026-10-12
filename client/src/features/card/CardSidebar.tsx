import { CardEnterpriseFields } from "./CardEnterpriseFields";
import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Tag,
  UserCheck,
  Flag,
  Trash2,
  Hash,
  FileText,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { CardTimer } from "./CardTimer";
import { CardCustomFields } from "./CardCustomFields";
import { useUpdateCard } from "@/hooks/card/useUpdateCard";
import { useDeleteCard } from "@/hooks/card/useDeleteCard";
import { useLabels } from "@/hooks/label/useLabels";
import { useSetCardLabels } from "@/hooks/card/useSetCardLabels";
import { useProjectMembers } from "@/hooks/productivity/useProjectMembers";
import { useSetCardAssignees } from "@/hooks/card/useSetCardAssignees";
import { useProject } from "@/hooks/project/useProject";
import type { Card, BoardColumn } from "@/types";

interface CardSidebarProps {
  card: Card;
  columns?: BoardColumn[];
  onClose: () => void;
}

export const CardSidebar: React.FC<CardSidebarProps> = ({
  card,
  columns = [],
  onClose,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { data: project } = useProject(card.project_id);
  const workspaceId = project?.workspace_id || "";

  const updateCard = useUpdateCard(card.project_id);
  const deleteCard = useDeleteCard(card.project_id);
  const setCardLabels = useSetCardLabels(card.project_id);
  const setCardAssignees = useSetCardAssignees(card.project_id);

  const { data: workspaceLabels = [] } = useLabels(workspaceId);
  const { data: members = [] } = useProjectMembers(card.project_id);

  const handlePriorityChange = (val: string) => {
    updateCard.mutate({
      id: card.id,
      priority: val,
    });
  };

  const handleColumnChange = (val: string) => {
    updateCard.mutate({
      id: card.id,
      column_id: val,
    });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCard.mutate({
      id: card.id,
      due_date: e.target.value || "",
    });
  };

  const handleEstimatedHoursChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const val = parseFloat(e.target.value);
    updateCard.mutate({
      id: card.id,
      estimated_hours: isNaN(val) ? undefined : val,
    });
  };

  const handleStoryPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    updateCard.mutate({
      id: card.id,
      story_points: isNaN(val) ? null : val,
    });
  };

  const handleToggleTemplate = () => {
    updateCard.mutate({
      id: card.id,
      is_template: !card.is_template,
    });
  };

  const toggleLabel = (labelId: string) => {
    const currentIds = card.labels.map((l) => l.id);
    const newIds = currentIds.includes(labelId)
      ? currentIds.filter((id) => id !== labelId)
      : [...currentIds, labelId];
    setCardLabels.mutate({ cardId: card.id, labelIds: newIds });
  };

  const toggleAssignee = (userId: string) => {
    const currentIds = card.assignees.map((a) => a.user_id);
    const newIds = currentIds.includes(userId)
      ? currentIds.filter((id) => id !== userId)
      : [...currentIds, userId];
    setCardAssignees.mutate({ cardId: card.id, userIds: newIds });
  };

  const handleConfirmDelete = () => {
    deleteCard.mutate(card.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        onClose();
      },
    });
  };

  return (
    <>
      <div className="space-y-5">
        {/* Live Stopwatch & Time Tracking Widget */}
        <CardTimer cardId={card.id} />

        {/* Status Column */}
        {columns.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Status
            </label>
            <Select value={card.column_id} onChange={handleColumnChange}>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Priority */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-teal-500" />
            Priority
          </label>
          <Select value={card.priority} onChange={handlePriorityChange}>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="no_priority">No Priority</option>
          </Select>
        </div>

        {/* Story Points & Estimation */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-teal-500" />
              Points
            </label>
            <Input
              type="number"
              step="1"
              min="0"
              value={card.story_points ?? ""}
              onChange={handleStoryPointsChange}
              placeholder="e.g. 5"
              className="text-xs h-8"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-500" />
              Est. Hours
            </label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={card.estimated_hours ?? ""}
              onChange={handleEstimatedHoursChange}
              placeholder="e.g. 4.5"
              className="text-xs h-8"
            />
          </div>
        </div>

        {/* Template Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-teal-500" />
            Template
          </label>
          <button
            type="button"
            onClick={handleToggleTemplate}
            className={`w-full text-xs p-2 rounded-lg border font-medium flex items-center justify-between transition-all cursor-pointer ${
              card.is_template
                ? "bg-teal-500/10 border-teal-500/40 text-teal-600 dark:text-teal-400 font-semibold"
                : "bg-slate-50 dark:bg-[#0d1a1d] border-slate-200 dark:border-[#183035] text-slate-600 dark:text-slate-300 hover:border-teal-500/30"
            }`}
          >
            <span>Mark as Reusable Template</span>
            <span
              className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                card.is_template
                  ? "bg-teal-500 border-teal-500 text-slate-950 font-bold"
                  : "border-slate-300 dark:border-border"
              }`}
            >
              {card.is_template ? "✓" : ""}
            </span>
          </button>
        </div>

        {/* Assignees */}
        <div data-shortcut="assignees" className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-teal-500" />
            Assignees
          </label>
          <div className="flex flex-wrap gap-1.5">
            {members.map((member) => {
              const isAssigned = card.assignees.some(
                (a) => a.user_id === member.user_id,
              );
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleAssignee(member.user_id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    isAssigned
                      ? "bg-teal-600 text-white border-teal-600 dark:bg-teal-500 dark:text-slate-950 font-semibold"
                      : "bg-slate-100 dark:bg-[#132428] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#183035] hover:border-teal-500/40"
                  }`}
                >
                  {member.display_name || member.username}
                </button>
              );
            })}
          </div>
        </div>

        {/* Labels */}
        <div data-shortcut="labels" className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-teal-500" />
            Labels
          </label>
          <div className="flex flex-wrap gap-1.5">
            {workspaceLabels.map((lbl) => {
              const hasLabel = card.labels.some((l) => l.id === lbl.id);
              return (
                <button
                  key={lbl.id}
                  type="button"
                  onClick={() => toggleLabel(lbl.id)}
                  className="text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: hasLabel
                      ? `${lbl.color}25`
                      : "transparent",
                    borderColor: hasLabel
                      ? lbl.color
                      : "var(--color-border, #183035)",
                    color: hasLabel ? lbl.color : "inherit",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: lbl.color }}
                  />
                  {lbl.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase">
            Start date
          </label>
          <Input
            type="date"
            aria-label="Start date"
            value={card.start_date?.slice(0, 10) || ""}
            onChange={(e) =>
              updateCard.mutate({ id: card.id, start_date: e.target.value })
            }
          />
        </div>
        {/* Due Date */}
        <div data-shortcut="due" className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-500" />
            Due Date
          </label>
          <Input
            type="date"
            value={card.due_date ? card.due_date.slice(0, 10) : ""}
            onChange={handleDueDateChange}
          />
        </div>

        {/* Custom Fields System */}
        <CardEnterpriseFields card={card} />
        <CardCustomFields card={card} />

        <div className="pt-4 border-t border-slate-200 dark:border-[#183035]">
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            onClick={() => setIsDeleteModalOpen(true)}
            isLoading={deleteCard.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Archive Card
          </Button>
        </div>
      </div>

      {/* Confirmation Modal replacing browser confirm alert */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Archive task "${card.title}"?`}
        description="The task will move to the archive. You can restore it from Project settings."
        confirmLabel="Archive Task"
        isDestructive={true}
        isLoading={deleteCard.isPending}
      />
    </>
  );
};
