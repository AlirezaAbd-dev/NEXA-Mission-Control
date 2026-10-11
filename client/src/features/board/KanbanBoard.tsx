import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { BoardColumn } from './BoardColumn';
import { CardItem } from './CardItem';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateColumn } from '@/hooks/board/useCreateColumn';
import { useMoveCard } from '@/hooks/card/useMoveCard';
import { useBoardStore } from '@/stores/board.store';
import type { Board, Card } from '@/types';

interface KanbanBoardProps {
  board: Board;
  cards: Card[];
  projectId: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ board, cards, projectId }) => {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const searchQuery = useBoardStore((s) => s.searchQuery);
  const filterPriority = useBoardStore((s) => s.filterPriority);

  const moveCard = useMoveCard(projectId);
  const createColumn = useCreateColumn(projectId, board.id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter cards based on search and priority
  const filteredCards = cards.filter((card) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = card.title.toLowerCase().includes(q);
      const matchDesc = card.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    if (filterPriority !== 'all' && card.priority !== filterPriority) {
      return false;
    }
    return true;
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceCard = cards.find((c) => c.id === activeId);
    if (!sourceCard) return;

    // Check if dropped directly onto a column or another card
    let targetColumnId = '';
    let targetPosition = 65536.0;

    const targetColumn = board.columns.find((c) => c.id === overId);
    if (targetColumn) {
      // Dropped into column directly
      targetColumnId = targetColumn.id;
      const columnCards = filteredCards.filter((c) => c.column_id === targetColumnId);
      if (columnCards.length > 0) {
        targetPosition = columnCards[columnCards.length - 1].position + 65536.0;
      }
    } else {
      // Dropped onto another card
      const targetCard = cards.find((c) => c.id === overId);
      if (targetCard) {
        targetColumnId = targetCard.column_id;
        targetPosition = targetCard.position;
      }
    }

    if (targetColumnId) {
      moveCard.mutate({
        id: activeId,
        column_id: targetColumnId,
        position: targetPosition,
      });
    }
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    createColumn.mutate(
      {
        name: newColumnName.trim(),
        type_: 'custom',
      },
      {
        onSuccess: () => {
          setNewColumnName('');
          setIsAddingColumn(false);
        },
      }
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start select-none">
        {board.columns.map((column) => {
          const colCards = filteredCards
            .filter((c) => c.column_id === column.id)
            .sort((a, b) => a.position - b.position);

          return (
            <BoardColumn
              key={column.id}
              column={column}
              cards={colCards}
              projectId={projectId}
            />
          );
        })}

        {/* Add Column Box */}
        <div className="w-72 md:w-80 shrink-0">
          {isAddingColumn ? (
            <form
              onSubmit={handleAddColumn}
              className="p-3 bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
            >
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Column name (e.g. In Review)"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button size="sm" type="submit" isLoading={createColumn.isPending}>
                  Add Column
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingColumn(false)}>
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
      </div>

      <DragOverlay>
        {activeCard ? <CardItem card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
};
