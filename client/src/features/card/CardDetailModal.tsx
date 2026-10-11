import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { CardHeader } from './CardHeader';
import { CardDescription } from './CardDescription';
import { CardChecklists } from './CardChecklists';
import { CardAttachments } from './CardAttachments';
import { CardActivityStream } from './CardActivityStream';
import { CardComments } from './CardComments';
import { CardSidebar } from './CardSidebar';
import { useCard } from '@/hooks/card/useCard';
import { useBoard } from '@/hooks/board/useBoard';
import { useUiStore } from '@/stores/ui.store';

export const CardDetailModal: React.FC = () => {
  const activeCardId = useUiStore((s) => s.activeCardId);
  const closeCardModal = useUiStore((s) => s.closeCardModal);
  const [activeTab, setActiveTab] = React.useState<'comments' | 'activity'>('comments');

  const { data: card, isLoading } = useCard(activeCardId || '');
  const { data: board } = useBoard(card?.project_id || '');

  if (!activeCardId) return null;

  return (
    <Modal
      isOpen={!!activeCardId}
      onClose={closeCardModal}
      size="2xl"
      className="max-h-[92vh] flex flex-col p-0 overflow-hidden"
    >
      {isLoading || !card ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">
          Loading card details...
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-2">
            <CardHeader card={card} />
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column (2/3 width) */}
            <div className="md:col-span-2 space-y-6">
              <CardDescription card={card} />
              <CardChecklists cardId={card.id} projectId={card.project_id} />
              <CardAttachments card={card} projectId={card.project_id} />

              {/* Tabs for Comments & Activity History */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-[#183035]">
                <div className="flex items-center gap-4 border-b border-slate-200/80 dark:border-[#183035]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('comments')}
                    className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors relative cursor-pointer ${
                      activeTab === 'comments'
                        ? 'text-teal-600 dark:text-teal-400 font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                  >
                    Comments
                    {activeTab === 'comments' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors relative cursor-pointer ${
                      activeTab === 'activity'
                        ? 'text-teal-600 dark:text-teal-400 font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                  >
                    Audit History
                    {activeTab === 'activity' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full" />
                    )}
                  </button>
                </div>

                {activeTab === 'comments' ? (
                  <CardComments cardId={card.id} projectId={card.project_id} />
                ) : (
                  <CardActivityStream cardId={card.id} />
                )}
              </div>
            </div>

            {/* Right Column (1/3 width) */}
            <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-slate-200 dark:border-[#183035] md:pl-6 pt-4 md:pt-0">
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
