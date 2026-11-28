import { formatNumber } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
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
  GripVertical,
  MoreHorizontal,
} from "lucide-react";
import { Button, Dropdown } from "@/components/ui";
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
  highlighted?: boolean;
  onMove?: () => void;
}

export const CardItem: React.FC<CardItemProps> = ({ card, preview = false, boardDragging = false, laneId, highlighted, onMove }) => {
  useUiLocale();
  const now = useNow();
  const openCardModal = useUiStore((s) => s.openCardModal);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
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

  const hasMetadata = card.priority !== "no_priority" || card.story_points != null || card.due_date ||
    card.checklist_total > 0 || card.comments_count > 0 || (card.votes_count ?? 0) > 0 || card.is_watched || card.assignees.length > 0;
  const stale = now - new Date(card.updated_at).getTime() > 14 * 86400000;
  const hasCoverColor = card.cover_url && card.cover_url.startsWith("#");
  const hasCoverImage = card.cover_url && !card.cover_url.startsWith("#");

  return (
    <article
      ref={setNodeRef}
      data-card-id={card.id}
      data-drag-preview={preview ? "" : undefined}
      style={style}
      aria-hidden={preview || undefined}
      className={`rounded-xl bg-[var(--nexa-surface-l1)] overflow-hidden border border-[var(--nexa-divider)] group focus-within:ring-1 focus-within:ring-primary/60 ${highlighted ? "ring-2 ring-primary/60" : ""}`}
    >
      {/* Trello Card Cover */}
      {hasCoverColor && (
        <div
          className="h-8 w-full border-b border-black/10 transition-transform group-hover:brightness-105"
          style={{ backgroundColor: card.cover_url! }}
        />
      )}

      {hasCoverImage && (
        <div className="h-28 w-full overflow-hidden border-b border-[var(--nexa-divider)] bg-[var(--nexa-surface-l2)]">
          <img
            src={card.cover_url!}
            alt={card.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Labels & Template Indicator */}
        {(card.is_template || card.labels.length > 0) && <div className="flex flex-wrap items-center gap-1">
          {card.is_template && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[var(--nexa-brand-surface)] text-primary flex items-center gap-1">
              <FileText className="w-2.5 h-2.5" />{tr("Template")}</span>
          )}
          {card.labels &&
            card.labels.length > 0 &&
            card.labels.map((lbl) => (
              <LabelBadge key={lbl.id} name={lbl.name} color={lbl.color} />
            ))}
        </div>}

        {stale && (
          <span className="text-[11px] text-warning">{tr("No updates for 14+ days")}</span>
        )}
        {/* Title */}
        <div className="flex items-start gap-1">
          <h4 className="min-w-0 flex-1">
            {preview ? <span dir="auto" className="break-words text-sm font-semibold">{card.title}</span> :
              <Button type="button" variant="ghost" onClick={() => openCardModal(card.id)}
                className="h-auto min-h-11 w-full justify-start px-1 py-1 text-start text-sm font-semibold leading-relaxed">
                <span dir="auto" className="min-w-0 break-words [overflow-wrap:anywhere]">{card.title}</span>
              </Button>}
          </h4>
          {!preview && <div className="flex shrink-0 items-center">
            <Button type="button" variant="ghost" size="icon" ref={setActivatorNodeRef} {...attributes} {...listeners}
              className="size-11 sm:size-8 touch-none cursor-grab p-1 text-foreground/75"
              aria-label={tr("Drag task: {title}", { title: card.title })}><GripVertical size={16} aria-hidden="true" /></Button>
            {onMove && <Dropdown ariaLabel={tr("Task actions: {title}", { title: card.title })}
              trigger={<MoreHorizontal size={16} aria-hidden="true" />} items={[{ id: "move", label: tr("Move to column"), onClick: onMove }]} />}
          </div>}
        </div>

        {/* Meta badges & assignees */}
        {hasMetadata && <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs flex-wrap">
            {card.priority !== "no_priority" && <PriorityBadge priority={card.priority} />}

            {/* Story Points */}
            {card.story_points !== undefined && card.story_points !== null && (
              <span className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-md bg-[var(--nexa-brand-surface)] text-primary font-bold">
                <Hash className="w-3 h-3" />
                {formatNumber(card.story_points)}
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
              <span className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-[var(--nexa-surface-l2)] text-muted-foreground">
                <CheckSquare className="w-3 h-3 text-primary" />
                {formatNumber(card.checklist_completed)}/{formatNumber(card.checklist_total)}
              </span>
            )}

            {card.comments_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MessageSquare className="w-3 h-3" />
                {formatNumber(card.comments_count)}
              </span>
            )}

            {(card.votes_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-warning font-medium">
                <ThumbsUp className="w-3 h-3 fill-current" />
                {formatNumber(card.votes_count ?? 0)}
              </span>
            )}

            {card.is_watched && (
              <span
                title={tr("You are watching this card")}
                className="text-primary"
              >
                <Eye className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Assignees */}
          {card.assignees && card.assignees.length > 0 && (
            <div className="flex flex-wrap items-center gap-0.5">
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
        </div>}
      </div>
    </article>
  );
};
