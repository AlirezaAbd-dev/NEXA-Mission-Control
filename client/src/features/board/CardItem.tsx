import { useNow } from "@/hooks/useNow";
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MessageSquare,
  CheckSquare,
  Hash,
  ThumbsUp,
  Eye,
  FileText,
} from "lucide-react";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { LabelBadge } from "@/components/common/LabelBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { DueDateBadge } from "@/components/common/DueDateBadge";
import { useUiStore } from "@/stores/ui.store";
import type { Card } from "@/types";

interface CardItemProps {
  card: Card;
  preview?: boolean;
  boardDragging?: boolean;
  laneId?: string;
}

export const CardItem: React.FC<CardItemProps> = ({ card, preview = false, boardDragging = false, laneId }) => {
  const now = useNow();
  const openCardModal = useUiStore((s) => s.openCardModal);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: preview ? "preview:"+card.id : laneId ? card.id+"::"+laneId : card.id,
    disabled: preview,
    data: {
      type: "card",
      card,
      laneId,
    },
  });

  const style: React.CSSProperties = {
    transform: preview || boardDragging ? undefined : CSS.Translate.toString(transform),
    transition: preview || boardDragging ? undefined : transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const stale = now - new Date(card.updated_at).getTime() > 14 * 86400000;
  const hasCoverColor = card.cover_url && card.cover_url.startsWith("#");
  const hasCoverImage = card.cover_url && !card.cover_url.startsWith("#");

  return (
    <div
      ref={setNodeRef}
      data-card-id={card.id}
      data-drag-preview={preview ? "" : undefined}
      style={style}
      {...attributes}
      {...listeners}
      onClick={preview ? undefined : () => openCardModal(card.id)}
      className="bg-white dark:bg-[#091316] rounded-xl shadow-xs border border-slate-200/80 dark:border-[#183035] hover:border-teal-500/50 cursor-grab active:cursor-grabbing transition-colors group overflow-hidden"
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
        {/* Labels & Template Indicator */}
        <div className="flex flex-wrap items-center gap-1">
          {card.is_template && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center gap-1">
              <FileText className="w-2.5 h-2.5" />
              Template
            </span>
          )}
          {card.labels &&
            card.labels.length > 0 &&
            card.labels.map((lbl) => (
              <LabelBadge key={lbl.id} name={lbl.name} color={lbl.color} />
            ))}
        </div>

        {stale && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400">
            No updates for 14+ days
          </span>
        )}
        {/* Title */}
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug">
          {card.title}
        </h4>

        {/* Meta badges & assignees */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-[#183035]">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs flex-wrap">
            <PriorityBadge priority={card.priority} />

            {/* Story Points */}
            {card.story_points !== undefined && card.story_points !== null && (
              <span className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold border border-teal-500/20">
                <Hash className="w-3 h-3" />
                {card.story_points}
              </span>
            )}

            {card.due_date && (
              <DueDateBadge
                dueDate={card.due_date}
                isCompleted={
                  card.checklist_total > 0 &&
                  card.checklist_completed === card.checklist_total
                }
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

            {(card.votes_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
                <ThumbsUp className="w-3 h-3 fill-current" />
                {card.votes_count}
              </span>
            )}

            {card.is_watched && (
              <span
                title="You are watching this card"
                className="text-teal-500"
              >
                <Eye className="w-3 h-3" />
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
