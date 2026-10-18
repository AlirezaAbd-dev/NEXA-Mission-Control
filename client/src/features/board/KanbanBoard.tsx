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
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateColumn } from "@/hooks/board/useCreateColumn";
import { useMoveCard } from "@/hooks/card/useMoveCard";
import { useBoardStore } from "@/stores/board.store";
import type { Board, Card } from "@/types";

interface KanbanBoardProps {
  board: Board;
  cards: Card[];
  projectId: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  cards,
  projectId,
}) => {
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
  const filteredCards = visibleCards.filter((card) => {
    if (
      selectedAssignee &&
      !card.assignees.some((a) => a.user_id === selectedAssignee)
    )
      return false;
    if (selectedLabel && !card.labels.some((l) => l.id === selectedLabel))
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = card.title.toLowerCase().includes(q);
      const matchDesc = card.description?.toLowerCase().includes(q);
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
          name: id.replace("_", " "),
          cards: filteredCards.filter((c) => c.priority === id),
        }))
      : grouping === "assignee"
        ? [
            {
              id: "unassigned",
              name: "Unassigned",
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
                name: "No epic",
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
          : [{ id: "all", name: "All tasks", cards: filteredCards }];
  return (
    <DndContext
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
            : "overflow-y-auto overscroll-contain pr-1 pb-10 space-y-6"
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
                  className="font-semibold text-sm hover:bg-slate-200/60 dark:hover:bg-[#132428] rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-100"
                  onClick={() =>
                    setCollapsed((ids) =>
                      ids.includes(lane.id)
                        ? ids.filter((id) => id !== lane.id)
                        : [...ids, lane.id],
                    )
                  }
                >
                  <span className="text-teal-500 font-bold mr-1.5">
                    {collapsed.includes(lane.id) ? "▸" : "▾"}
                  </span>
                  <span>{lane.name}</span>
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-[#132428] text-slate-600 dark:text-teal-400 font-mono font-medium border border-slate-200/80 dark:border-[#183035]">
                    {lane.cards.length}
                  </span>
                </Button>
              </div>
            )}
            {!collapsed.includes(lane.id) && (
              <div
                className={`flex gap-3 sm:gap-4 overflow-x-auto pb-3 select-none scroll-smooth snap-x snap-mandatory sm:snap-none ${
                  grouping === "none"
                    ? "flex-1 min-h-0 h-full items-stretch"
                    : "items-start min-h-[140px]"
                }`}
              >
                {board.columns.map((column) => {
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
                      draggingCardId={activeCard?.id}
                      dropTarget={dropTarget?.columnId === column.id && dropTarget.laneId === lane.id ? dropTarget : null}
                    />
                  );
                })}

                {lane.id === lanes[0].id && (
                  <>
                    {/* Add Column Box */}
                    <div className="w-[88vw] max-w-[340px] sm:w-72 md:w-80 shrink-0 snap-center sm:snap-align-none self-start">
                      {isAddingColumn ? (
                        <form
                          onSubmit={handleAddColumn}
                          className="p-3 bg-white dark:bg-[#0d1a1d] border border-slate-200/90 dark:border-[#183035] rounded-2xl shadow-sm space-y-2"
                        >
                          <Input
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            placeholder="Column name (e.g. In Review)"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              type="submit"
                              isLoading={createColumn.isPending}
                            >
                              Add Column
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsAddingColumn(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full border-dashed h-12 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          onClick={() => setIsAddingColumn(true)}
                        >
                          <Plus className="w-4 h-4" />
                          Add another list
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <CardItem card={activeCard} preview /> : null}
      </DragOverlay>
    </DndContext>
  );
};
