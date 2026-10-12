import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, MoreHorizontal, Trash2, FileText } from "lucide-react";
import { CardItem } from "./CardItem";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useUpdateColumn } from "@/hooks/board/useUpdateColumn";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useCreateCard } from "@/hooks/card/useCreateCard";
import { useCards } from "@/hooks/card/useCards";
import { useDeleteColumn } from "@/hooks/board/useDeleteColumn";
import type { BoardColumn as IBoardColumn, Card } from "@/types";

interface BoardColumnProps {
  column: IBoardColumn;
  cards: Card[];
  projectId: string;
  laneId?: string;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  column,
  cards,
  projectId,
  laneId,
}) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [sort, setSort] = useState("position");
  const [wipOpen, setWipOpen] = useState(false);
  const [wip, setWip] = useState(String(column.wip_limit || 0));
  const updateColumn = useUpdateColumn(projectId);
  const priorityOrder = ["urgent", "high", "medium", "low", "no_priority"];
  const sortedCards = [...cards].sort((a, b) =>
    sort === "title"
      ? a.title.localeCompare(b.title)
      : sort === "priority"
        ? priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
        : sort === "due"
          ? (a.due_date || "9999").localeCompare(b.due_date || "9999")
          : sort === "created"
            ? a.created_at.localeCompare(b.created_at)
            : a.position - b.position,
  );

  const createCard = useCreateCard(projectId);
  const deleteColumn = useDeleteColumn(projectId);
  const { data: allProjectCards = [] } = useCards({ project_id: projectId });
  const totalCount = allProjectCards.filter(
    (c) => c.column_id === column.id,
  ).length;
  const exceeded = !!column.wip_limit && totalCount > column.wip_limit;
  const templates = allProjectCards.filter((c) => c.is_template);

  const handleCreateFromTemplate = (template: Card) => {
    createCard.mutate(
      {
        column_id: column.id,
        title: `${template.title} (Copy)`,
        description: template.description || undefined,
        priority: template.priority,
        estimated_hours: template.estimated_hours || undefined,
        story_points: template.story_points || undefined,
        label_ids: template.labels.map((l) => l.id),
      },
      {
        onSuccess: () => {
          setIsAddingCard(false);
        },
      },
    );
  };

  const { setNodeRef, isOver } = useDroppable({
    id: laneId ? `${column.id}::${laneId}` : column.id,
    data: {
      type: "column",
      column,
    },
  });

  const cardIds = cards.map((c) => c.id);

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) {
      setCardError("Card title cannot be empty");
      return;
    }
    setCardError(null);

    createCard.mutate(
      {
        column_id: column.id,
        title: newCardTitle.trim(),
      },
      {
        onSuccess: () => {
          setNewCardTitle("");
          setIsAddingCard(false);
        },
        onError: (err: any) => {
          setCardError(
            err?.response?.data?.error?.message || "Failed to create card",
          );
        },
      },
    );
  };

  const handleConfirmDelete = () => {
    deleteColumn.mutate(column.id, {
      onSuccess: () => setIsDeleteModalOpen(false),
    });
  };

  return (
    <>
      <div
        ref={setNodeRef}
        className={`w-72 md:w-80 shrink-0 flex flex-col max-h-full rounded-2xl bg-slate-100/70 dark:bg-[#0d1a1d] border border-slate-200/80 dark:border-[#183035] transition-colors ${
          exceeded
            ? "ring-2 ring-amber-500/50"
            : isOver
              ? "ring-2 ring-teal-500/40 bg-slate-200/60 dark:bg-[#132428]"
              : ""
        }`}
      >
        {/* Column Header */}
        <div className="p-3.5 pb-2.5 flex items-center justify-between gap-2 border-b border-slate-200/40 dark:border-[#183035]/60">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
              {column.name}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-[#132428] border border-slate-200 dark:border-[#183035] text-slate-500 dark:text-teal-400 font-mono font-medium">
              {cards.length}
              {column.wip_limit
                ? ` · ${totalCount}/${column.wip_limit} WIP`
                : ""}
              {exceeded ? " · Exceeded" : ""}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              onClick={() => {
                setCardError(null);
                setIsAddingCard(true);
              }}
              title="Add card"
            >
              <Plus className="w-4 h-4" />
            </Button>

            <Dropdown
              trigger={
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              }
              items={[
                {
                  id: "wip",
                  label: "Set WIP limit",
                  onClick: () => setWipOpen(true),
                },
                {
                  id: "delete",
                  label: "Delete column",
                  icon: <Trash2 className="w-4 h-4 text-rose-500" />,
                  danger: true,
                  onClick: () => setIsDeleteModalOpen(true),
                },
              ]}
            />
          </div>
        </div>

        <div className="px-3 pb-2">
          <CustomSelect
            value={sort}
            onChange={setSort}
            options={[
              { value: "position", label: "Manual order" },
              { value: "title", label: "Title A–Z" },
              { value: "priority", label: "Priority" },
              { value: "due", label: "Due date" },
              { value: "created", label: "Created date" },
            ]}
          />
        </div>
        {/* Cards List Container */}
        <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-24">
          <SortableContext
            items={cardIds}
            strategy={verticalListSortingStrategy}
          >
            {sortedCards.map((card) => (
              <CardItem key={card.id} card={card} />
            ))}
          </SortableContext>
        </div>

        {/* Add Card Form / Button */}
        <div className="p-2 pt-0">
          {isAddingCard ? (
            <form
              onSubmit={handleCreateCard}
              className="space-y-2 bg-white dark:bg-[#091316] p-2.5 rounded-xl border border-slate-200 dark:border-[#183035]"
            >
              <Input
                value={newCardTitle}
                onChange={(e) => {
                  setNewCardTitle(e.target.value);
                  if (cardError) setCardError(null);
                }}
                placeholder="What needs to be done?"
                error={cardError || undefined}
                autoFocus
              />
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  type="submit"
                  isLoading={createCard.isPending}
                >
                  Add Card
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAddingCard(false)}
                >
                  Cancel
                </Button>
              </div>

              {templates.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-[#183035] space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-teal-500" />
                    Use Template:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {templates.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleCreateFromTemplate(tmpl)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25 hover:bg-teal-500/20 transition-colors truncate max-w-[180px] cursor-pointer"
                        title={tmpl.title}
                      >
                        {tmpl.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <button
              onClick={() => {
                setCardError(null);
                setIsAddingCard(true);
              }}
              className="w-full flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-[#132428] transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-teal-500" />
              Add Card
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={wipOpen}
        onClose={() => setWipOpen(false)}
        title="Work in progress limit"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            updateColumn.mutate(
              { columnId: column.id, wip_limit: Number(wip) },
              { onSuccess: () => setWipOpen(false) },
            );
          }}
        >
          <Input
            type="number"
            min="0"
            max="1000"
            label="Limit (0 = unlimited)"
            value={wip}
            onChange={(e) => setWip(e.target.value)}
          />
          <Button type="submit" isLoading={updateColumn.isPending}>
            Save limit
          </Button>
        </form>
      </Modal>
      {/* Custom Confirmation Modal replacing browser alert */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Delete column "${column.name}"?`}
        description="Are you sure you want to delete this column? All cards located inside this column will be permanently unlinked."
        confirmLabel="Delete Column"
        isDestructive={true}
        isLoading={deleteColumn.isPending}
      />
    </>
  );
};
