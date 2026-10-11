import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, CheckSquare } from 'lucide-react';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { LabelBadge } from '@/components/common/LabelBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { DueDateBadge } from '@/components/common/DueDateBadge';
import { useUiStore } from '@/stores/ui.store';
import type { Card } from '@/types';

interface CardItemProps {
  card: Card;
}

export const CardItem: React.FC<CardItemProps> = ({ card }) => {
  const openCardModal = useUiStore((s) => s.openCardModal);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const hasCoverColor = card.cover_url && card.cover_url.startsWith('#');
  const hasCoverImage = card.cover_url && !card.cover_url.startsWith('#');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => openCardModal(card.id)}
      className="bg-white dark:bg-[#091316] rounded-xl shadow-xs border border-slate-200/80 dark:border-[#183035] hover:border-teal-500/50 cursor-grab active:cursor-grabbing transition-all group overflow-hidden"
    >
      {/* Trello Card Cover */}
      {hasCoverColor && (
        <div
          className="h-8 w-full border-b border-black/10 transition-transform group-hover:brightness-105"
          style={{ backgroundColor: card.cover_url! }}
        />
      )}

      {hasCoverImage && (
        <div className="h-28 w-full overflow-hidden border-b border-slate-100 dark:border-[#183035] bg-slate-100 dark:bg-[#070e10]">
          <img
            src={card.cover_url!}
            alt={card.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.map((lbl) => (
              <LabelBadge key={lbl.id} name={lbl.name} color={lbl.color} />
            ))}
          </div>
        )}

        {/* Title */}
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug">
          {card.title}
        </h4>

        {/* Meta badges & assignees */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-[#183035]">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs flex-wrap">
            <PriorityBadge priority={card.priority} />

            {card.due_date && (
              <DueDateBadge
                dueDate={card.due_date}
                isCompleted={card.checklist_total > 0 && card.checklist_completed === card.checklist_total}
              />
            )}

            {card.checklist_total > 0 && (
              <span className="flex items-center gap-1 text-[11px] px-1 py-0.5 rounded bg-slate-100 dark:bg-[#132428] text-slate-500 dark:text-slate-400">
                <CheckSquare className="w-3 h-3 text-teal-500" />
                {card.checklist_completed}/{card.checklist_total}
              </span>
            )}

            {card.comments_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <MessageSquare className="w-3 h-3" />
                {card.comments_count}
              </span>
            )}
          </div>

          {/* Assignees */}
          {card.assignees && card.assignees.length > 0 && (
            <div className="flex items-center -space-x-1.5 overflow-hidden shrink-0">
              {card.assignees.map((assignee) => (
                <UserAvatar
                  key={assignee.user_id}
                  displayName={assignee.display_name || assignee.username}
                  avatarUrl={assignee.avatar_url}
                  size="xs"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
