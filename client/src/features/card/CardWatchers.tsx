import { formatNumber } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import React, { useState } from 'react';
import { Eye, EyeOff, Users } from 'lucide-react';
import { useCardWatchers, useToggleWatchCard } from '@/hooks/card/useCardWatchers';
import type { Card } from '@/types';

interface CardWatchersProps {
  card: Card;
}

export const CardWatchers: React.FC<CardWatchersProps> = ({ card }) => {
  useUiLocale();
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
              ? 'bg-primary/15 border-primary/40 text-primary'
              : 'bg-[var(--nexa-surface-l2)] border-[var(--nexa-divider)] text-muted-foreground hover:border-primary/30 hover:text-foreground'
          }`}
          title={isWatched ? tr("Stop watching this card") : tr("Watch this card for updates")}
        >
          {isWatched ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-primary" />
              <span>{tr("Watching")}</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{tr("Watch")}</span>
            </>
          )}
          {count > 0 && (
            <span className="ms-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary/20 text-primary font-bold">
              {formatNumber(count)}
            </span>
          )}
        </button>

        {count > 0 && (
          <button
            type="button"
            onClick={() => setShowWatcherList(!showWatcherList)}
            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-[var(--nexa-surface-l2)] transition-colors cursor-pointer"
            title={tr("View subscribers")}
          >
            <Users className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showWatcherList && watchers.length > 0 && (
        <div
          data-nexa-popup-surface=""
          className="absolute end-0 top-full mt-1.5 z-50 w-52 p-2 bg-[var(--nexa-popup-fill)] border border-[var(--nexa-divider)] rounded-xl shadow-xl space-y-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-1 border-b border-[var(--nexa-divider)]">{tr("Subscribers (")}{formatNumber(watchers.length)})
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {watchers.map((w) => (
              <div
                key={w.user_id}
                className="flex items-center gap-2 p-1 rounded-md text-xs text-foreground"
              >
                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
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
