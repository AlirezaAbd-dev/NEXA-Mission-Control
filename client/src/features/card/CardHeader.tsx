import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useUpdateCard } from '@/hooks/card/useUpdateCard';
import type { Card } from '@/types';

interface CardHeaderProps {
  card: Card;
  onClose: () => void;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ card, onClose }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(card.title);
  const updateCard = useUpdateCard(card.project_id);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== card.title) {
      updateCard.mutate({
        id: card.id,
        title: title.trim(),
      });
    } else {
      setTitle(card.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitle(card.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
            CARD-{card.id.slice(0, 6)}
          </span>
          {card.archived_at && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-medium">
              Archived
            </span>
          )}
        </div>

        {isEditingTitle ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full text-xl font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <h2
            onClick={() => setIsEditingTitle(true)}
            className="text-xl font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
          >
            {card.title}
          </h2>
        )}
      </div>

      <button
        onClick={onClose}
        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
        aria-label="Close modal"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
