import React, { useState } from 'react';
import { Eye, EyeOff, Users } from 'lucide-react';
import { useCardWatchers, useToggleWatchCard } from '@/hooks/card/useCardWatchers';
import type { Card } from '@/types';

interface CardWatchersProps {
  card: Card;
}

export const CardWatchers: React.FC<CardWatchersProps> = ({ card }) => {
  const { data: watchers = [] } = useCardWatchers(card.id);
  const toggleWatch = useToggleWatchCard();
  const [showWatcherList, setShowWatcherList] = useState(false);

  const isWatched = card.is_watched ?? false;
  const count = card.watchers_count ?? watchers.length;

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => toggleWatch.mutate(card.id)}
          disabled={toggleWatch.isPending}
          className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
            isWatched
              ? 'bg-teal-500/15 border-teal-500/40 text-teal-600 dark:text-teal-400'
              : 'bg-slate-100 dark:bg-[#132428] border-slate-200 dark:border-[#183035] text-slate-600 dark:text-slate-300 hover:border-teal-500/30'
          }`}
          title={isWatched ? 'Stop watching this card' : 'Watch this card for updates'}
        >
          {isWatched ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-teal-500" />
              <span>Watching</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Watch</span>
            </>
          )}
          {count > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold">
              {count}
            </span>
          )}
        </button>

        {count > 0 && (
          <button
            type="button"
            onClick={() => setShowWatcherList(!showWatcherList)}
            className="p-1 rounded-md text-slate-400 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-[#132428] transition-colors cursor-pointer"
            title="View subscribers"
          >
            <Users className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showWatcherList && watchers.length > 0 && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-52 p-2 bg-white dark:bg-[#0d1a1d] border border-slate-200 dark:border-[#183035] rounded-xl shadow-xl space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 pb-1 border-b border-slate-100 dark:border-[#183035]">
            Subscribers ({watchers.length})
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {watchers.map((w) => (
              <div
                key={w.user_id}
                className="flex items-center gap-2 p-1 rounded-md text-xs text-slate-700 dark:text-slate-200"
              >
                <div className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {w.display_name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{w.display_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
