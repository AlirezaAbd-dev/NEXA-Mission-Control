import { formatNumber } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, MoreHorizontal, Trash2, ArrowDownWideNarrow } from "lucide-react";
import { CardDropPlaceholder } from "./CardDropPlaceholder";
import type { CardDropTarget } from "./cardDrop";
import { ColumnRenameModal } from "./ColumnRenameModal";
import { CardItem } from "./CardItem";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useUpdateColumn } from "@/hooks/board/useUpdateColumn";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useDeleteColumn } from "@/hooks/board/useDeleteColumn";
import type { BoardColumn as IBoardColumn, Card } from "@/types";

interface BoardColumnProps {
  column: IBoardColumn;
  cards: Card[];
  projectId: string;
  laneId?: string;
  draggingCardId?: string;
  dropTarget?: CardDropTarget | null;
  totalCount: number;
  highlightedTaskId?: string;
  onAdd: () => void;
  onMoveTask?: (task: Card) => void;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  column,
  cards,
  projectId,
  laneId,
  draggingCardId,
  dropTarget, totalCount, highlightedTaskId, onAdd, onMoveTask,
}) => {
  useUiLocale();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [sort, setSort] = useState("position");
  const [sortOpen, setSortOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const sortOptions = [
    { value: "position", label: tr("Manual order") },
    { value: "title", label: tr("Title A–Z") },
    { value: "priority", label: tr("Priority") },
    { value: "due", label: tr("Due date") },
    { value: "created", label: tr("Created date") },
  ];
  const [renameOpen,setRenameOpen] = useState(false);
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

  const deleteColumn = useDeleteColumn(projectId);
  const exceeded = !!column.wip_limit && totalCount > column.wip_limit;

  const { setNodeRef, isOver } = useDroppable({
    id: laneId ? `${column.id}::${laneId}` : column.id,
    disabled: collapsed,
    data: {
      type: "column",
      column,
      laneId,
    },
  });

  const cardIds = sortedCards.map((card) => laneId ? card.id+"::"+laneId : card.id);

  const handleConfirmDelete = () => {
    deleteColumn.mutate(column.id, {
      onSuccess: () => setIsDeleteModalOpen(false),
    });
  };

  return (
    <>
      {renameOpen && <ColumnRenameModal column={column} projectId={projectId} onClose={()=>setRenameOpen(false)} />}
      <div
        ref={setNodeRef}
        data-column-id={column.id}
        className={`w-full ${collapsed ? "md:w-44 self-start" : "md:w-80 h-full"} shrink-0 flex min-h-0 flex-col rounded-xl bg-[var(--nexa-surface-l2)]/75 transition-colors shadow-[var(--nexa-elevation-subtle)] ${
          exceeded
            ? "ring-2 ring-warning/50"
            : isOver
              ? "ring-2 ring-primary/40 bg-[var(--nexa-surface-l2)]"
              : ""
        }`}
      >
        {/* Column Header */}
        <div className="px-3 py-1.5 flex items-center justify-between gap-2 border-b border-[var(--nexa-divider)]">
          <div className="flex items-center gap-2 min-w-0">
            <h3 dir="auto" className="font-semibold text-sm text-foreground truncate">
              {column.name}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--nexa-surface-l1)] text-primary font-mono font-semibold">
              {formatNumber(cards.length)}
              {column.wip_limit
                ? tr("· {value0}/{value1} WIP", { value0: (totalCount), value1: (column.wip_limit) })
                : ""}
              {exceeded ? tr("· Exceeded") : ""}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onAdd}
              aria-label={tr("Add task to {column}", { column: column.name })}
              title={tr("Add task to {column}", { column: column.name })}
            >
              <Plus className="w-4 h-4" />
            </Button>

            <Dropdown
              ariaLabel={tr("Column actions: {column}", { column: column.name })}
              trigger={
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              }
              items={[
                { id: "sort", label: tr("Sort tasks"), onClick: () => setSortOpen(true) },
                { id: "collapse", label: collapsed ? tr("Expand column") : tr("Collapse column"), onClick: () => setCollapsed(value => !value) },
                {id:"rename",label:tr("Rename column"),onClick:()=>setRenameOpen(true)},
                {
                  id: "wip",
                  label: tr("Set WIP limit"),
                  onClick: () => setWipOpen(true),
                },
                {
                  id: "delete",
                  label: tr("Delete column"),
                  icon: <Trash2 className="w-4 h-4 text-rose-500" />,
                  danger: true,
                  onClick: () => setIsDeleteModalOpen(true),
                },
              ]}
            />
          </div>
        </div>

        {sort !== "position" && !collapsed && <Button type="button" variant="ghost" size="sm" className="self-start mx-2" onClick={() => setSortOpen(true)}>
          <ArrowDownWideNarrow size={14} aria-hidden="true" />{sortOptions.find(option => option.value === sort)?.label}
        </Button>}
        {collapsed ? <Button type="button" variant="ghost" size="sm" className="m-2" onClick={() => setCollapsed(false)}>{tr("Expand column")}</Button> : (
        <div className="flex-1 min-h-0 space-y-2 overflow-y-auto overscroll-y-contain p-2" aria-label={column.name}>
          {!cards.length && <p className="px-2 py-4 text-sm text-foreground/75">{tr("No tasks in this column.")}</p>}
          <SortableContext
            items={cardIds}
            strategy={verticalListSortingStrategy}
          >
            {sortedCards.map((card) => (
              <React.Fragment key={card.id}>
                {dropTarget?.beforeId === card.id && <CardDropPlaceholder />}
                <CardItem card={card} laneId={laneId} boardDragging={!!draggingCardId} highlighted={highlightedTaskId === card.id} onMove={onMoveTask ? () => onMoveTask(card) : undefined} />
              </React.Fragment>
            ))}
            {dropTarget && !dropTarget.beforeId && <CardDropPlaceholder />}
          </SortableContext>
        </div>

        )}
      </div>
      <Modal isOpen={sortOpen} title={tr("Sort tasks")} onClose={() => setSortOpen(false)} size="sm">
        <CustomSelect label={tr("Sort tasks")} value={sort} options={sortOptions} onChange={value => { setSort(value); setSortOpen(false); }} />
      </Modal>
      <Modal
        isOpen={wipOpen}
        onClose={() => setWipOpen(false)}
        title={tr("Work in progress limit")}
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
            label={tr("Limit (0 = unlimited)")}
            value={wip}
            onChange={(e) => setWip(e.target.value)}
          />
          <Button type="submit" isLoading={updateColumn.isPending}>{tr("Save limit")}</Button>
        </form>
      </Modal>
      {/* Custom Confirmation Modal replacing browser alert */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={tr("Delete column \"{value0}\"?", { value0: (column.name) })}
        description={tr("Are you sure you want to delete this column? All cards located inside this column will be permanently unlinked.")}
        confirmLabel={tr("Delete Column")}
        isDestructive={true}
        isLoading={deleteColumn.isPending}
      />
    </>
  );
};
