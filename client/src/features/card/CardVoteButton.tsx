import { formatNumber } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import React from 'react';
import { ThumbsUp } from 'lucide-react';
import { useToggleVoteCard } from '@/hooks/card/useCardVote';
import type { Card } from '@/types';

interface CardVoteButtonProps {
  card: Card;
}

export const CardVoteButton: React.FC<CardVoteButtonProps> = ({ card }) => {
  useUiLocale();
  const toggleVote = useToggleVoteCard();

  const hasVoted = card.has_voted ?? false;
  const count = card.votes_count ?? 0;

  return (
    <button
      type="button"
      onClick={() => toggleVote.mutate(card.id)}
      disabled={toggleVote.isPending}
      className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
        hasVoted
          ? 'bg-warning/15 border-warning/40 text-warning font-semibold'
          : 'bg-[var(--nexa-surface-l2)] border-[var(--nexa-divider)] text-muted-foreground hover:border-warning/30 hover:text-warning'
      }`}
      title={hasVoted ? tr("Remove your vote") : tr("Upvote / Kudos this card")}
    >
      <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current text-amber-500' : ''}`} />
      <span>{hasVoted ? tr("Voted") : tr("Vote")}</span>
      {count > 0 && (
        <span className="ms-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
          {formatNumber(count)}
        </span>
      )}
    </button>
  );
};
