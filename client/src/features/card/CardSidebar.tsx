import React, { useState } from 'react';
import { Calendar, Clock, Tag, UserCheck, Flag, Trash2 } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useUpdateCard } from '@/hooks/card/useUpdateCard';
import { useDeleteCard } from '@/hooks/card/useDeleteCard';
import { useLabels } from '@/hooks/label/useLabels';
import { useSetCardLabels } from '@/hooks/card/useSetCardLabels';
import { useWorkspaceMembers } from '@/hooks/workspace/useWorkspaceMembers';
import { useSetCardAssignees } from '@/hooks/card/useSetCardAssignees';
import { useProject } from '@/hooks/project/useProject';
import type { Card, BoardColumn } from '@/types';

interface CardSidebarProps {
  card: Card;
  columns?: BoardColumn[];
  onClose: () => void;
}

export const CardSidebar: React.FC<CardSidebarProps> = ({ card, columns = [], onClose }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { data: project } = useProject(card.project_id);
  const workspaceId = project?.workspace_id || '';

  const updateCard = useUpdateCard(card.project_id);
  const deleteCard = useDeleteCard(card.project_id);
  const setCardLabels = useSetCardLabels(card.project_id);
  const setCardAssignees = useSetCardAssignees(card.project_id);

  const { data: workspaceLabels = [] } = useLabels(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateCard.mutate({
      id: card.id,
      priority: e.target.value,
    });
  };

  const handleColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateCard.mutate({
      id: card.id,
      column_id: e.target.value,
    });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCard.mutate({
      id: card.id,
      due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined,
    });
  };

  const handleEstimatedHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    updateCard.mutate({
      id: card.id,
      estimated_hours: isNaN(val) ? undefined : val,
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
      <div className="space-y-6">
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

        {/* Assignees */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-teal-500" />
            Assignees
          </label>
          <div className="flex flex-wrap gap-1.5">
            {members.map((member) => {
              const isAssigned = card.assignees.some((a) => a.user_id === member.user_id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleAssignee(member.user_id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    isAssigned
                      ? 'bg-teal-600 text-white border-teal-600 dark:bg-teal-500 dark:text-slate-950 font-semibold'
                      : 'bg-slate-100 dark:bg-[#132428] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#183035] hover:border-teal-500/40'
                  }`}
                >
                  {member.display_name || member.username}
                </button>
              );
            })}
          </div>
        </div>

        {/* Labels */}
        <div className="space-y-1.5">
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
                  className="text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5"
                  style={{
                    backgroundColor: hasLabel ? `${lbl.color}25` : 'transparent',
                    borderColor: hasLabel ? lbl.color : 'var(--color-border, #183035)',
                    color: hasLabel ? lbl.color : 'inherit',
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

        {/* Due Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-500" />
            Due Date
          </label>
          <Input
            type="date"
            value={card.due_date ? card.due_date.slice(0, 10) : ''}
            onChange={handleDueDateChange}
          />
        </div>

        {/* Estimate Hours */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-500" />
            Estimated Hours
          </label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={card.estimated_hours ?? ''}
            onChange={handleEstimatedHoursChange}
            placeholder="e.g. 4.5"
          />
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-[#183035]">
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            onClick={() => setIsDeleteModalOpen(true)}
            isLoading={deleteCard.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Card
          </Button>
        </div>
      </div>

      {/* Confirmation Modal replacing browser confirm alert */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Delete task "${card.title}"?`}
        description="Are you sure you want to permanently delete this task? This action cannot be undone."
        confirmLabel="Delete Task"
        isDestructive={true}
        isLoading={deleteCard.isPending}
      />
    </>
  );
};
