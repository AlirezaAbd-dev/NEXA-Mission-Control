import React from 'react';
import { useParams } from 'react-router';
import { useCards } from '@/hooks/card/useCards';
import { useUiStore } from '@/stores/ui.store';
import { GanttChartSquare } from 'lucide-react';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { EmptyState } from '@/components/common/EmptyState';

export const TimelinePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: cards = [], isLoading } = useCards({ project_id: projectId || '' });
  const openCardModal = useUiStore((s) => s.openCardModal);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading timeline...</div>;
  }

  // Generate 14 day intervals for timeline visualization
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i - 3);
    return d;
  });

  return (
    <div className="h-full flex flex-col p-6 space-y-4 overflow-hidden max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Timeline</h1>
          <p className="text-sm text-slate-500">Roadmap and Gantt-style schedule overview</p>
        </div>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<GanttChartSquare className="w-6 h-6 text-slate-400" />}
          title="No tasks scheduled"
          description="Create cards with start and due dates to view your timeline."
        />
      ) : (
        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col">
          {/* Header row with dates */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 sticky top-0 z-10">
            <div className="w-64 p-3 font-semibold text-xs text-slate-400 uppercase border-r border-slate-200 dark:border-slate-800 shrink-0">
              Task
            </div>
            <div className="flex-1 grid grid-cols-14 min-w-[700px]">
              {days.map((d, i) => (
                <div
                  key={i}
                  className="p-2 text-center text-xs border-r border-slate-200/50 dark:border-slate-800/50 text-slate-400"
                >
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{d.getDate()}</div>
                  <div className="text-[10px] uppercase">
                    {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800 flex-1 overflow-y-auto">
            {cards.map((card) => (
              <div
                key={card.id}
                onClick={() => openCardModal(card.id)}
                className="flex items-center hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors h-12"
              >
                <div className="w-64 px-4 flex items-center justify-between gap-2 border-r border-slate-200 dark:border-slate-800 shrink-0 truncate">
                  <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{card.title}</span>
                  <PriorityBadge priority={card.priority} />
                </div>

                <div className="flex-1 grid grid-cols-14 min-w-[700px] h-full relative items-center px-1">
                  {/* Timeline bar representation */}
                  <div className="col-span-4 col-start-3 h-6 bg-indigo-500/20 border border-indigo-500/50 text-indigo-600 dark:text-indigo-400 rounded-md px-2 flex items-center text-xs font-medium truncate">
                    {card.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
