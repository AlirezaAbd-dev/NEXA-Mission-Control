import React from 'react';
import { useParams } from 'react-router';
import { useCards } from '@/hooks/card/useCards';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { LabelBadge } from '@/components/common/LabelBadge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useUiStore } from '@/stores/ui.store';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { ListFilter } from 'lucide-react';

export const ListPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: cards = [], isLoading } = useCards({ project_id: projectId || '' });
  const openCardModal = useUiStore((s) => s.openCardModal);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading list...</div>;
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-4 overflow-hidden max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">List View</h1>
          <p className="text-sm text-slate-500">Comprehensive tabular breakdown of project items</p>
        </div>
        <span className="text-xs text-slate-400 font-mono">{cards.length} items</span>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<ListFilter className="w-6 h-6 text-slate-400" />}
          title="No tasks yet"
          description="Create your first task on the Kanban board or backlog."
        />
      ) : (
        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0">
              <tr>
                <th className="py-3 px-4">Key</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Labels</th>
                <th className="py-3 px-4">Assignees</th>
                <th className="py-3 px-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {cards.map((card) => (
                <tr
                  key={card.id}
                  onClick={() => openCardModal(card.id)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-xs text-slate-400">
                    CARD-{card.id.slice(0, 5)}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-md truncate">
                    {card.title}
                  </td>
                  <td className="py-3 px-4">
                    <PriorityBadge priority={card.priority} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {card.labels.map((lbl) => (
                        <LabelBadge key={lbl.id} name={lbl.name} color={lbl.color} />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center -space-x-1.5">
                      {card.assignees.map((a) => (
                        <UserAvatar
                          key={a.user_id}
                          displayName={a.display_name || a.username}
                          avatarUrl={a.avatar_url}
                          size="xs"
                        />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">
                    {card.due_date ? formatDate(card.due_date) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
