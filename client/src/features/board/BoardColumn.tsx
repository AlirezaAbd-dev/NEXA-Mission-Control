import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { CardItem } from './CardItem';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { useCreateCard } from '@/hooks/card/useCreateCard';
import { useDeleteColumn } from '@/hooks/board/useDeleteColumn';
import type { BoardColumn as IBoardColumn, Card } from '@/types';

interface BoardColumnProps {
  column: IBoardColumn;
  cards: Card[];
  projectId: string;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({ column, cards, projectId }) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const createCard = useCreateCard(projectId);
  const deleteColumn = useDeleteColumn(projectId);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const cardIds = cards.map((c) => c.id);

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    createCard.mutate(
      {
        column_id: column.id,
        title: newCardTitle.trim(),
      },
      {
        onSuccess: () => {
          setNewCardTitle('');
          setIsAddingCard(false);
        },
      }
    );
  };

  const handleDeleteColumn = () => {
    if (confirm(`Delete column "${column.name}"?`)) {
      deleteColumn.mutate(column.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`w-72 md:w-80 shrink-0 flex flex-col max-h-full rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 transition-colors ${
        isOver ? 'ring-2 ring-indigo-500/40 bg-slate-200/60 dark:bg-slate-850' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-3 pb-2 flex items-center justify-between gap-2 border-b border-slate-200/40 dark:border-slate-800/40">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{column.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 font-mono font-medium">
            {cards.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="w-7 h-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            onClick={() => setIsAddingCard(true)}
            title="Add card"
          >
            <Plus className="w-4 h-4" />
          </Button>

          <Dropdown
            trigger={
              <Button
                size="icon"
                variant="ghost"
                className="w-7 h-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            }
            items={[
              {
                id: 'delete',
                label: 'Delete column',
                icon: <Trash2 className="w-4 h-4 text-red-500" />,
                danger: true,
                onClick: handleDeleteColumn,
              },
            ]}
          />
        </div>
      </div>

      {/* Cards List Container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-24">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>

      {/* Add Card Form / Button */}
      <div className="p-2 pt-0">
        {isAddingCard ? (
          <form onSubmit={handleCreateCard} className="space-y-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
            <Input
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" type="submit" isLoading={createCard.isPending}>
                Add Card
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAddingCard(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className="w-full flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Card
          </button>
        )}
      </div>
    </div>
  );
};
