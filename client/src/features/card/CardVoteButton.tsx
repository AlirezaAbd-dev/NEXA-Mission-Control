import React from 'react';
import { ThumbsUp } from 'lucide-react';
import { useToggleVoteCard } from '@/hooks/card/useCardVote';
import type { Card } from '@/types';

interface CardVoteButtonProps {
  card: Card;
}

export const CardVoteButton: React.FC<CardVoteButtonProps> = ({ card }) => {
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
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold'
          : 'bg-slate-100 dark:bg-[#132428] border-slate-200 dark:border-[#183035] text-slate-600 dark:text-slate-300 hover:border-amber-500/30 hover:text-amber-500'
      }`}
      title={hasVoted ? 'Remove your vote' : 'Upvote / Kudos this card'}
    >
      <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current text-amber-500' : ''}`} />
      <span>{hasVoted ? 'Voted' : 'Vote'}</span>
      {count > 0 && (
        <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
          {count}
        </span>
      )}
    </button>
  );
};
