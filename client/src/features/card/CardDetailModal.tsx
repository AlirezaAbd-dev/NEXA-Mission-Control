import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { CardHeader } from './CardHeader';
import { CardDescription } from './CardDescription';
import { CardChecklists } from './CardChecklists';
import { CardComments } from './CardComments';
import { CardSidebar } from './CardSidebar';
import { useCard } from '@/hooks/card/useCard';
import { useBoard } from '@/hooks/board/useBoard';
import { useUiStore } from '@/stores/ui.store';

export const CardDetailModal: React.FC = () => {
  const activeCardId = useUiStore((s) => s.activeCardId);
  const closeCardModal = useUiStore((s) => s.closeCardModal);

  const { data: card, isLoading } = useCard(activeCardId || '');
  const { data: board } = useBoard(card?.project_id || '');

  if (!activeCardId) return null;

  return (
    <Modal
      isOpen={!!activeCardId}
      onClose={closeCardModal}
      size="xl"
      className="max-h-[90vh] flex flex-col p-0 overflow-hidden"
    >
      {isLoading || !card ? (
        <div className="p-8 text-center text-slate-500 animate-pulse">
          Loading card details...
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-2">
            <CardHeader card={card} onClose={closeCardModal} />
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column (2/3 width) */}
            <div className="md:col-span-2 space-y-6">
              <CardDescription card={card} />
              <CardChecklists cardId={card.id} projectId={card.project_id} />
              <CardComments cardId={card.id} projectId={card.project_id} />
            </div>

            {/* Right Column (1/3 width) */}
            <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 md:pl-6 pt-4 md:pt-0">
              <CardSidebar
                card={card}
                columns={board?.columns}
                onClose={closeCardModal}
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
