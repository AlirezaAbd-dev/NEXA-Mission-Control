import React from 'react';
import { useParams } from 'react-router';
import { KanbanBoard } from './KanbanBoard';
import { BoardFilters } from './BoardFilters';
import { useBoard } from '@/hooks/board/useBoard';
import { useCards } from '@/hooks/card/useCards';
import { EmptyState } from '@/components/common/EmptyState';
import { LayoutGrid } from 'lucide-react';

export const BoardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: board, isLoading: isBoardLoading } = useBoard(projectId || '');
  const { data: cards = [], isLoading: isCardsLoading } = useCards({ project_id: projectId || '' });

  if (!projectId) {
    return (
      <div className="p-8 text-center text-slate-500">
        No project selected.
      </div>
    );
  }

  if (isBoardLoading || isCardsLoading) {
    return (
      <div className="p-8 text-center text-slate-500 animate-pulse">
        Loading board...
      </div>
    );
  }

  if (!board) {
    return (
      <EmptyState
        icon={<LayoutGrid className="w-6 h-6 text-indigo-500" />}
        title="Board not found"
        description="Could not load the board for this project."
      />
    );
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-4 overflow-hidden">
      {/* Top action bar: Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <BoardFilters />
      </div>

      {/* Kanban Board canvas */}
      <KanbanBoard board={board} cards={cards} projectId={projectId} />
    </div>
  );
};
