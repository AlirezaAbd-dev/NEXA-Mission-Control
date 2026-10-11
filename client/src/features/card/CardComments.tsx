import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useComments } from '@/hooks/comment/useComments';
import { useCreateComment } from '@/hooks/comment/useCreateComment';
import { useToggleReaction } from '@/hooks/comment/useToggleReaction';
import { formatRelativeTime } from '@/lib/utils';
import type { CardComment } from '@/types';

interface CardCommentsProps {
  cardId: string;
  projectId: string;
}

export const CardComments: React.FC<CardCommentsProps> = ({ cardId, projectId }) => {
  const { data: comments = [], isLoading } = useComments(cardId);
  const createComment = useCreateComment(cardId, projectId);
  const [commentText, setCommentText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    createComment.mutate(commentText.trim(), {
      onSuccess: () => setCommentText(''),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <MessageSquare className="w-4 h-4 text-slate-400" />
        <span>Activity & Comments ({comments.length})</span>
      </div>

      {/* New Comment Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full resize-none"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!commentText.trim()}
            isLoading={createComment.isPending}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Comment
          </Button>
        </div>
      </form>

      {/* Comment List */}
      {isLoading ? (
        <div className="text-xs text-slate-400 animate-pulse">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-xs text-slate-400 italic py-2">No comments yet.</div>
      ) : (
        <div className="space-y-3 pt-2">
          {comments.map((comment) => (
            <CommentItem key={comment.id} cardId={cardId} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
};

interface CommentItemProps {
  cardId: string;
  comment: CardComment;
}

const CommentItem: React.FC<CommentItemProps> = ({ cardId, comment }) => {
  const toggleReaction = useToggleReaction(cardId);
  const availableEmojis = ['👍', '❤️', '🚀', '👀'];

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
      <UserAvatar
        displayName={comment.author_name}
        avatarUrl={comment.author_avatar}
        size="sm"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{comment.author_name}</span>
          <span className="text-xs text-slate-400">
            {formatRelativeTime(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{comment.body}</p>

        {/* Reactions */}
        <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
          {comment.reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              onClick={() =>
                toggleReaction.mutate({
                  commentId: comment.id,
                  emoji: reaction.emoji,
                })
              }
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <span>{reaction.emoji}</span>
              <span className="text-[11px] font-medium">{reaction.count}</span>
            </button>
          ))}

          {/* Quick Reaction buttons */}
          <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            {availableEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() =>
                  toggleReaction.mutate({
                    commentId: comment.id,
                    emoji,
                  })
                }
                className="hover:scale-125 transition-transform text-xs p-0.5"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
