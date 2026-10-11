import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, CheckSquare, Clock } from 'lucide-react';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { LabelBadge } from '@/components/common/LabelBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useUiStore } from '@/stores/ui.store';
import { formatDate } from '@/lib/utils';
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
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => openCardModal(card.id)}
      className="bg-white dark:bg-slate-900 rounded-lg p-3 shadow-xs border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 cursor-grab active:cursor-grabbing transition-all space-y-2 group"
    >
      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((lbl) => (
            <LabelBadge key={lbl.id} name={lbl.name} color={lbl.color} />
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
        {card.title}
      </h4>

      {/* Meta badges & assignees */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <PriorityBadge priority={card.priority} />

          {card.checklist_total > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <CheckSquare className="w-3 h-3" />
              {card.checklist_completed}/{card.checklist_total}
            </span>
          )}

          {card.comments_count > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <MessageSquare className="w-3 h-3" />
              {card.comments_count}
            </span>
          )}

          {card.due_date && (
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3" />
              {formatDate(card.due_date)}
            </span>
          )}
        </div>

        {/* Assignees */}
        {card.assignees && card.assignees.length > 0 && (
          <div className="flex items-center -space-x-1.5 overflow-hidden">
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
  );
};
