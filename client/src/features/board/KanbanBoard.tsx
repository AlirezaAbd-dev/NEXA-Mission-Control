import { getLocale, normalizeSearch, uiLabel } from "@/i18n";
import { formatNumber } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import React, { useState, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  type DragMoveEvent,
  type CollisionDetection,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { usePreferences } from "@/hooks/enterprise/usePreferences";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import type { CardMetadata } from "@/types/enterprise";
import { applyCardPlacement, cardDropTarget, type CardDropTarget } from "./cardDrop";
import { apiError } from "@/lib/apiError";
import { Plus } from "lucide-react";
import { BoardColumn } from "./BoardColumn";
import { CardItem } from "./CardItem";
import { Button, CustomSelect, Modal } from "@/components/ui";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { Input } from "@/components/ui/Input";
import { useCreateColumn } from "@/hooks/board/useCreateColumn";
import { useMoveCard } from "@/hooks/card/useMoveCard";
import { useBoardStore } from "@/stores/board.store";
import type { Board, Card } from "@/types";

interface KanbanBoardProps {
  board: Board;
  cards: Card[];
  projectId: string;
  onAdd: (columnId: string) => void;
  createdTask: Card | null;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  cards,
  projectId, onAdd, createdTask,
}) => {
  useUiLocale();
  const isMobile = useMobileViewport();
  const [selectedColumn, setSelectedColumn] = useState("");
  const [moving, setMoving] = useState<Card | null>(null);
  const [destination, setDestination] = useState("");
  const [moveError, setMoveError] = useState("");
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const columns = board.columns;
  const mobileColumn = columns.find(column => column.id === selectedColumn) || columns[0];
  const shownColumns = isMobile && mobileColumn ? [mobileColumn] : columns;
  const [lastCreated, setLastCreated] = useState(createdTask?.id);
  if (createdTask && lastCreated !== createdTask.id) {
    setLastCreated(createdTask.id);
    setSelectedColumn(createdTask.column_id);
  }
  const { data: preferences = {} } = usePreferences(projectId);
  const { data: epics = [] } = useEnterpriseResource(projectId, "epics");
  const { data: metadata = [] } = useEnterpriseResource<CardMetadata[]>(
    projectId,
    "metadata",
  );
  const [notice, setNotice] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [dropTarget,setDropTarget] = useState<CardDropTarget | null>(null);
  const dropTargetRef = useRef<CardDropTarget | null>(null);
  const dragLane = useRef<string | undefined>(undefined);
  const moveSequence = useRef(0);
  const [pendingDrops,setPendingDrops] = useState<Record<string,{column_id:string;position:number;sequence:number;placement:{before_id:string|null}}>>({});
  const visibleCards = Object.entries(pendingDrops).reduce((current,[id,patch])=>applyCardPlacement(current,id,patch.column_id,patch.placement.before_id),cards);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const searchQuery = useBoardStore((s) => s.searchQuery);
  const selectedAssignee = useBoardStore((s) => s.selectedAssigneeId);
  const selectedLabel = useBoardStore((s) => s.selectedLabelId);
  const filterPriority = useBoardStore((s) => s.filterPriority);

  const moveCard = useMoveCard(projectId);
  const createColumn = useCreateColumn(projectId, board.id);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Filter cards based on search and priority
  const columnCounts = new Map<string, number>();
  for (const card of visibleCards) {
    columnCounts.set(card.column_id, (columnCounts.get(card.column_id) || 0) + 1);
  }
  const filteredCards = visibleCards.filter((card) => {
    if (
      selectedAssignee &&
      !card.assignees.some((a) => a.user_id === selectedAssignee)
    )
      return false;
    if (selectedLabel && !card.labels.some((l) => l.id === selectedLabel))
      return false;
    if (searchQuery) {
      const q = normalizeSearch(searchQuery);
      const matchTitle = normalizeSearch(card.title).includes(q);
      const matchDesc = normalizeSearch(card.description || "").includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    if (filterPriority !== "all" && card.priority !== filterPriority) {
      return false;
    }
    return true;
  });

  const clearDrag = () => {
    setActiveCard(null);
    setDropTarget(null);
    dropTargetRef.current = null;
  };
  const handleDragStart = ({active}: DragStartEvent) => {
    const card = visibleCards.find(card => card.id === active.data.current?.card?.id);
    if (card) {
      setNotice("");
      setActiveCard(card);
      dragLane.current = active.data.current?.laneId;
      dropTargetRef.current = null;
      setDropTarget(null);
    }
  };
  const updateDropTarget = ({active,over,activatorEvent}: DragMoveEvent) => {
    if (!over || active.data.current?.type !== "card") {
      dropTargetRef.current = null; setDropTarget(null); return;
    }
    const data = over.data.current;
    const source = active.data.current?.card as Card;
    const laneId = data?.laneId as string | undefined;
    if (dragLane.current !== laneId) { dropTargetRef.current=null;setDropTarget(null);return; }
    const targetCard = data?.type === "card" ? visibleCards.find(card=>card.id===data.card?.id) : undefined;
    const columnId = targetCard?.column_id || (data?.type === "column" ? data.column.id : undefined);
    if (!columnId) { dropTargetRef.current=null;setDropTarget(null);return; }
    const translated = active.rect.current.translated;
    const sourceOrder = visibleCards.filter(card=>card.column_id===source.column_id).sort((a,b)=>a.position-b.position);
    const belowMiddle = activatorEvent.type === "keydown"
      ? !!targetCard && source.column_id === targetCard.column_id && sourceOrder.findIndex(card=>card.id===source.id) < sourceOrder.findIndex(card=>card.id===targetCard.id)
      : !!translated && translated.top + translated.height/2 > over.rect.top + over.rect.height/2;
    const target = cardDropTarget(visibleCards,source.id,columnId,targetCard?.id || null,belowMiddle,laneId);
    const previous=dropTargetRef.current;
    if(previous?.columnId===target?.columnId && previous?.laneId===target?.laneId && previous?.beforeId===target?.beforeId && previous?.position===target?.position) return;
    dropTargetRef.current=target;setDropTarget(target);
  };
  const collisionDetection: CollisionDetection = args => {
    const containers = args.droppableContainers.filter(container=>container.id!==args.active.id);
    const hits = pointerWithin(args);
    if (hits.length) {
      const cards = hits.filter(hit=>args.droppableContainers.find(container=>container.id===hit.id)?.data.current?.type === "card");
      return cards.length ? cards : hits;
    }
    return args.pointerCoordinates ? [] : closestCorners({...args,droppableContainers:containers});
  };
  const handleDragEnd = ({active,over}: DragEndEvent) => {
    const target = dropTargetRef.current;
    const source = visibleCards.find(card=>card.id===active.data.current?.card?.id);
    if (!over || !source || !target) {clearDrag();return;}
    const destination = board.columns.find(column=>column.id===target.columnId);
    if (destination?.wip_limit && visibleCards.filter(card=>card.column_id===target.columnId && card.id!==source.id).length+1 > destination.wip_limit)
      setNotice(destination.name+" is above its work in progress limit.");
    const sequence = ++moveSequence.current;
    const patch={id:source.id,column_id:target.columnId,position:target.position,placement:{before_id:target.beforeId}};
    // Keep the destination visible through the query notification/refetch handoff.
    setPendingDrops(current=>({...current,[source.id]:{...patch,sequence}}));
    void moveCard.mutateAsync(patch)
      .catch(error=>setNotice(apiError(error)))
      .finally(()=>setPendingDrops(current=>{
        if(current[source.id]?.sequence!==sequence)return current;
        const next={...current};delete next[source.id];return next;
      }));
    clearDrag();
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    createColumn.mutate(
      {
        name: newColumnName.trim(),
        type_: "custom",
      },
      {
        onSuccess: () => {
          setNewColumnName("");
          setIsAddingColumn(false);
        },
      },
    );
  };

  const grouping = preferences.grouping || "none";
  const lanes =
    grouping === "priority"
      ? ["urgent", "high", "medium", "low", "no_priority"].map((id) => ({
          id,
          name: uiLabel(id),
          cards: filteredCards.filter((c) => c.priority === id),
        }))
      : grouping === "assignee"
        ? [
            {
              id: "unassigned",
              name: tr("Unassigned"),
              cards: filteredCards.filter((c) => !c.assignees.length),
            },
            ...Array.from(
              new Map(
                cards.flatMap((c) => c.assignees).map((a) => [a.user_id, a]),
              ).values(),
            ).map((a) => ({
              id: a.user_id,
              name: a.display_name || a.username,
              cards: filteredCards.filter(
                (c) => c.assignees.some((x) => x.user_id === a.user_id),
              ),
            })),
          ]
        : grouping === "epic"
          ? [
              {
                id: "no-epic",
                name: tr("No epic"),
                cards: filteredCards.filter(
                  (c) => !metadata.find((m) => m.id === c.id)?.epic_id,
                ),
              },
              ...epics.map((e) => ({
                id: e.id,
                name: e.name,
                cards: filteredCards.filter(
                  (c) => metadata.find((m) => m.id === c.id)?.epic_id === e.id,
                ),
              })),
            ]
          : [{ id: "all", name: tr("All tasks"), cards: filteredCards }];
  return (
    <DndContext
      accessibility={{
        screenReaderInstructions: { draggable: tr("Press Space to pick up a task, use arrow keys to move it, press Space to drop it or Escape to cancel.") },
        announcements: {
          onDragStart: () => tr("Task picked up."),
          onDragOver: ({ over }) => over ? tr("Task moved over a drop target.") : tr("Task is outside a drop target."),
          onDragEnd: ({ over }) => over ? tr("Task dropped.") : tr("Task movement cancelled."),
          onDragCancel: () => tr("Task movement cancelled."),
        },
      }}
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragMove={updateDropTarget}
      onDragOver={updateDropTarget}
      onDragCancel={clearDrag}
    >
      <div
        className={`flex-1 min-h-0 h-full flex flex-col ${
          grouping === "none"
            ? "overflow-hidden"
            : "overflow-y-auto overscroll-contain pe-1 pb-10 space-y-6"
        }`}
      >
        {notice && (
          <p
            role="status"
            className="p-2.5 text-xs text-amber-600 dark:text-amber-400 shrink-0"
          >
            {notice}
          </p>
        )}
        {isMobile && <div className="mb-2 flex shrink-0 items-center gap-2">
          <CustomSelect className="min-w-0 flex-1" ariaLabel={tr("Board column")} value={mobileColumn?.id}
            options={columns.map(column => ({ value: column.id, label: column.name }))} onChange={setSelectedColumn} disabled={!columns.length} />
          <Button type="button" variant="outline" size="icon" aria-label={tr("Add another list")} onClick={() => setIsAddingColumn(true)}><Plus size={16} /></Button>
        </div>}
        {lanes.map((lane) => (
          <section
            key={lane.id}
            className={
              grouping === "none"
                ? "flex-1 min-h-0 h-full flex flex-col"
                : "shrink-0 flex flex-col"
            }
          >
            {grouping !== "none" && (
              <div className="sticky top-0 z-20 flex items-center justify-between pb-2 bg-inherit/90 backdrop-blur-md">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-semibold text-sm hover:bg-slate-200/60 dark:hover:bg-white/[0.05] rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-100"
                  onClick={() =>
                    setCollapsed((ids) =>
                      ids.includes(lane.id)
                        ? ids.filter((id) => id !== lane.id)
                        : [...ids, lane.id],
                    )
                  }
                >
                  <span className="text-primary font-bold me-1.5">
                    {collapsed.includes(lane.id) ? "▸" : "▾"}
                  </span>
                  <span>{lane.name}</span>
                  <span className="ms-2 px-2 py-0.5 rounded-full text-xs bg-[var(--nexa-surface-l2)] text-primary font-mono font-medium border border-[var(--nexa-divider)]">
                    {formatNumber(lane.cards.length)}
                  </span>
                </Button>
              </div>
            )}
            {!collapsed.includes(lane.id) && (
              <div
                onTouchStart={event => {
                  const target = event.target;
                  if (!isMobile || event.touches.length !== 1 || !(target instanceof Element) || target.closest("button, input, a")) {
                    swipe.current = null;
                    return;
                  }
                  swipe.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
                }}
                onTouchCancel={() => { swipe.current = null; }}
                onTouchEnd={event => {
                  const start = swipe.current;
                  swipe.current = null;
                  if (!start || !mobileColumn || !event.changedTouches.length || activeCard) return;
                  const dx = event.changedTouches[0].clientX - start.x;
                  const dy = event.changedTouches[0].clientY - start.y;
                  if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
                  const step = (dx < 0 ? 1 : -1) * (getLocale() === "fa" ? -1 : 1);
                  const next = columns[columns.findIndex(column => column.id === mobileColumn.id) + step];
                  if (next) setSelectedColumn(next.id);
                }}
                className={`flex gap-3 pb-2 max-md:touch-pan-y md:gap-4 md:overflow-x-auto ${
                  grouping === "none"
                    ? "flex-1 min-h-0 h-full items-stretch"
                    : "items-start min-h-[140px]"
                }`}
              >
                {shownColumns.map((column) => {
                  const colCards = lane.cards
                    .filter((c) => c.column_id === column.id)
                    .sort((a, b) => a.position - b.position);

                  return (
                    <BoardColumn
                      key={column.id}
                      column={column}
                      laneId={lane.id}
                      cards={colCards}
                      projectId={projectId}
                      totalCount={columnCounts.get(column.id) || 0}
                      highlightedTaskId={createdTask?.id}
                      onAdd={() => onAdd(column.id)}
                      onMoveTask={columns.length > 1 ? card => { setDestination(""); setMoveError(""); setMoving(card); } : undefined}
                      draggingCardId={activeCard?.id}
                      dropTarget={dropTarget?.columnId === column.id && dropTarget.laneId === lane.id ? dropTarget : null}
                    />
                  );
                })}

                {!isMobile && lane.id === lanes[0].id && <Button type="button" variant="outline" className="shrink-0 self-start border-dashed" onClick={() => setIsAddingColumn(true)}>
                  <Plus size={15} aria-hidden="true" />{tr("Add another list")}
                </Button>}
              </div>
            )}
          </section>
        ))}
      </div>

      <Modal isOpen={isAddingColumn} title={tr("Add Column")} onClose={() => setIsAddingColumn(false)} size="sm">
        <form onSubmit={handleAddColumn} className="space-y-3">
          <Input label={tr("Column name (e.g. In Review)")} value={newColumnName} onChange={event => setNewColumnName(event.target.value)} autoFocus required />
          <Button type="submit" isLoading={createColumn.isPending} disabled={!newColumnName.trim()}>{tr("Add Column")}</Button>
        </form>
      </Modal>
      {moving && <Modal isOpen title={tr("Move to column")} onClose={() => { if (!moveCard.isPending) setMoving(null); }} size="sm">
        <form className="space-y-3" onSubmit={event => {
          event.preventDefault();
          if (!destination || destination === moving.column_id || moveCard.isPending) return;
          setMoveError("");
          moveCard.mutate({ id: moving.id, column_id: destination, position: 0, placement: { before_id: null } }, {
            onSuccess: () => {
              setNotice(tr("Task moved to {column}.", { column: columns.find(column => column.id === destination)?.name || "" }));
              setSelectedColumn(destination);
              setMoving(null);
            },
            onError: error => setMoveError(apiError(error)),
          });
        }}>
          <p dir="auto" className="break-words text-sm font-semibold">{moving.title}</p>
          <CustomSelect label={tr("Column")} value={destination} onChange={setDestination}
            options={columns.filter(column => column.id !== moving.column_id).map(column => ({ value: column.id, label: column.name }))} disabled={moveCard.isPending} />
          {moveError && <p role="alert" className="text-sm text-danger">{moveError}</p>}
          <div data-dialog-actions className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={moveCard.isPending} onClick={() => setMoving(null)}>{tr("Cancel")}</Button>
            <Button type="submit" disabled={!destination} isLoading={moveCard.isPending}>{tr("Move task")}</Button>
          </div>
        </form>
      </Modal>}
      <DragOverlay dropAnimation={null}>
        {activeCard ? <CardItem card={activeCard} preview /> : null}
      </DragOverlay>
    </DndContext>
  );
};
