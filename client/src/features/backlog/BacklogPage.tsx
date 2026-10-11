import React, { useState } from 'react';
import { useParams } from 'react-router';
import { Plus, Play, CheckCircle2, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { useSprints } from '@/hooks/sprint/useSprints';
import { useCreateSprint } from '@/hooks/sprint/useCreateSprint';
import { useUpdateSprint } from '@/hooks/sprint/useUpdateSprint';
import { useCards } from '@/hooks/card/useCards';
import { useUiStore } from '@/stores/ui.store';
import { formatDate } from '@/lib/utils';
import type { Sprint, Card } from '@/types';

export const BacklogPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const openCardModal = useUiStore((s) => s.openCardModal);

  const { data: sprints = [], isLoading: isSprintsLoading } = useSprints(projectId || '');
  const { data: cards = [], isLoading: isCardsLoading } = useCards({ project_id: projectId || '' });
  const createSprint = useCreateSprint(projectId || '');

  if (!projectId) return null;

  const handleCreateSprint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintName.trim()) return;
    createSprint.mutate(
      {
        name: sprintName.trim(),
      },
      {
        onSuccess: () => {
          setSprintName('');
          setIsCreatingSprint(false);
        },
      }
    );
  };

  if (isSprintsLoading || isCardsLoading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading backlog...</div>;
  }

  // Active or planned sprints
  const activeSprint = sprints.find((s) => s.status === 'active');
  const plannedSprints = sprints.filter((s) => s.status === 'planned');

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Backlog & Sprints</h1>
          <p className="text-sm text-slate-500">Plan and estimate upcoming sprint work</p>
        </div>
        <Button onClick={() => setIsCreatingSprint(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Create Sprint
        </Button>
      </div>

      {/* New sprint creation inline form */}
      {isCreatingSprint && (
        <form onSubmit={handleCreateSprint} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">New Sprint</h3>
          <Input
            value={sprintName}
            onChange={(e) => setSprintName(e.target.value)}
            placeholder="Sprint Name (e.g. Sprint 1 - Foundations)"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" type="submit" isLoading={createSprint.isPending}>
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreatingSprint(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Active Sprint Section */}
      {activeSprint && (
        <SprintSection
          sprint={activeSprint}
          projectId={projectId}
          cards={cards}
          onCardClick={openCardModal}
        />
      )}

      {/* Planned Sprints */}
      {plannedSprints.map((sprint) => (
        <SprintSection
          key={sprint.id}
          sprint={sprint}
          projectId={projectId}
          cards={cards}
          onCardClick={openCardModal}
        />
      ))}

      {/* Main Backlog Section */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Backlog</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
              {cards.length} issues
            </span>
          </div>
        </div>

        {cards.length === 0 ? (
          <EmptyState
            icon={<Layers className="w-6 h-6 text-slate-400" />}
            title="Backlog is empty"
            description="Create issues on your board to start planning them into sprints."
          />
        ) : (
          <div className="space-y-1.5">
            {cards.map((card) => (
              <BacklogCardRow key={card.id} card={card} onClick={() => openCardModal(card.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface SprintSectionProps {
  sprint: Sprint;
  projectId: string;
  cards: Card[];
  onCardClick: (cardId: string) => void;
}

const SprintSection: React.FC<SprintSectionProps> = ({ sprint, projectId, cards, onCardClick }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const updateSprint = useUpdateSprint(projectId);

  const handleStartSprint = () => {
    updateSprint.mutate({
      id: sprint.id,
      status: 'active',
      start_date: new Date().toISOString(),
    });
  };

  const handleCompleteSprint = () => {
    updateSprint.mutate({
      id: sprint.id,
      status: 'completed',
      end_date: new Date().toISOString(),
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{sprint.name}</span>
          {sprint.status === 'active' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
              Active
            </span>
          )}
          {sprint.start_date && sprint.end_date && (
            <span className="text-xs text-slate-400">
              {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {sprint.status === 'planned' && (
            <Button size="sm" variant="outline" onClick={handleStartSprint} isLoading={updateSprint.isPending}>
              <Play className="w-3.5 h-3.5 mr-1" />
              Start Sprint
            </Button>
          )}
          {sprint.status === 'active' && (
            <Button size="sm" variant="outline" onClick={handleCompleteSprint} isLoading={updateSprint.isPending}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Complete Sprint
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-1.5">
          {cards.slice(0, 3).map((card) => (
            <BacklogCardRow key={card.id} card={card} onClick={() => onCardClick(card.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

interface BacklogCardRowProps {
  card: Card;
  onClick: () => void;
}

const BacklogCardRow: React.FC<BacklogCardRowProps> = ({ card, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between gap-4 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-mono text-slate-400">CARD-{card.id.slice(0, 5)}</span>
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{card.title}</span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <PriorityBadge priority={card.priority} />
        {card.estimated_hours && (
          <span className="text-xs font-mono text-slate-400">{card.estimated_hours}h</span>
        )}
      </div>
    </div>
  );
};
