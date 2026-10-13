import { Markdown } from "@/components/common/Markdown";
import { Checkbox } from "@/components/ui/Checkbox";
import { useProjectMembers } from "@/hooks/productivity/useProjectMembers";
import { useAuthStore } from "@/stores/auth.store";
import { apiError } from "@/lib/apiError";
import React, { useState } from "react";
import { MessageSquare, Send, Edit2, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useComments } from "@/hooks/comment/useComments";
import { useCreateComment } from "@/hooks/comment/useCreateComment";
import { useUpdateComment } from "@/hooks/comment/useUpdateComment";
import { useDeleteComment } from "@/hooks/comment/useDeleteComment";
import { useToggleReaction } from "@/hooks/comment/useToggleReaction";
import { formatRelativeTime } from "@/lib/utils";
import type { CardComment } from "@/types";

interface CardCommentsProps {
  cardId: string;
  projectId: string;
}

export const CardComments: React.FC<CardCommentsProps> = ({
  cardId,
  projectId,
}) => {
  const { data: comments = [], isLoading } = useComments(cardId);
  const createComment = useCreateComment(cardId, projectId);
  const { data: members = [] } = useProjectMembers(projectId);
  const user = useAuthStore((s) => s.user);
  const admin = ["owner", "admin"].includes(
    members.find((m) => m.user_id === user?.id)?.role || "",
  );
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    createComment.mutate(
      { body: commentText.trim(), is_internal: internal },
      {
        onError: (e) => setError(apiError(e)),
        onSuccess: () => setCommentText(""),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <MessageSquare className="w-4 h-4 text-slate-400" />
        <span>Activity & Comments ({comments.length})</span>
      </div>

      {/* New Comment Input */}
      {error && (
        <p role="alert" className="text-xs text-rose-500">
          {error}
        </p>
      )}
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
        {admin && (
          <Checkbox
            checked={internal}
            onChange={setInternal}
            label="Internal · visible to project administrators"
          />
        )}
      </form>

      {/* Comment List */}
      {isLoading ? (
        <div className="text-xs text-slate-400 animate-pulse">
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-xs text-slate-400 italic py-2">
          No comments yet.
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              cardId={cardId}
              projectId={projectId}
              comment={comment}
              currentUserId={user?.id}
              isAdmin={admin}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface CommentItemProps {
  cardId: string;
  projectId: string;
  comment: CardComment;
  currentUserId?: string;
  isAdmin?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  cardId,
  projectId,
  comment,
  currentUserId,
  isAdmin,
}) => {
  const toggleReaction = useToggleReaction(cardId);
  const updateComment = useUpdateComment(cardId);
  const deleteComment = useDeleteComment(cardId, projectId);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body);
  const [editError, setEditError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const availableEmojis = ["👍", "❤️", "🚀", "👀"];

  const isAuthor = currentUserId && comment.author_id === currentUserId;
  const canEdit = !!isAuthor;
  const canDelete = isAuthor || isAdmin;

  const handleStartEdit = () => {
    setEditText(comment.body);
    setEditError("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditText(comment.body);
    setEditError("");
    setIsEditing(false);
  };

  const handleSaveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editText.trim()) {
      setEditError("Comment cannot be empty");
      return;
    }
    if (editText.trim() === comment.body) {
      setIsEditing(false);
      return;
    }
    setEditError("");
    updateComment.mutate(
      { commentId: comment.id, body: editText.trim() },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
        onError: (err) => {
          setEditError(apiError(err));
        },
      },
    );
  };

  const handleDeleteConfirm = () => {
    deleteComment.mutate(comment.id, {
      onSuccess: () => {
        setDeleteModalOpen(false);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <>
      <div className="group relative flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-[#091316] border border-slate-200/60 dark:border-[#183035] transition-colors hover:border-slate-300 dark:hover:border-teal-500/30">
        <UserAvatar
          displayName={comment.author_name}
          avatarUrl={comment.author_avatar}
          size="sm"
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header: Author + Timestamp + Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {comment.author_name}
              </span>
              <span className="text-[11px] text-slate-400">
                {formatRelativeTime(comment.created_at)}
              </span>
              {comment.edited_at && (
                <span
                  className="text-[10px] text-slate-400 dark:text-slate-500 italic select-none"
                  title={
                    comment.edited_at
                      ? `Edited ${formatRelativeTime(comment.edited_at)}`
                      : "Edited"
                  }
                >
                  · edited
                </span>
              )}
              {comment.is_internal && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20">
                  Internal
                </span>
              )}
            </div>

            {/* Action buttons (Edit & Delete) */}
            {!isEditing && (canEdit || canDelete) && (
              <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-[#132428] transition-colors cursor-pointer"
                    title="Edit comment"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(true)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Comment Body / Edit Mode */}
          {isEditing ? (
            <div className="space-y-2 pt-1">
              {editError && (
                <p role="alert" className="text-xs text-rose-500">
                  {editError}
                </p>
              )}
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                autoFocus
                placeholder="Edit your comment..."
                className="w-full resize-none text-sm"
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  Esc to cancel · ⌘+Enter to save
                </span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={updateComment.isPending}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSaveEdit}
                    isLoading={updateComment.isPending}
                    disabled={!editText.trim()}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <Markdown text={comment.body} />
            </div>
          )}

          {/* Reactions */}
          {!isEditing && (
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-[#132428] hover:bg-slate-200 dark:hover:bg-[#183035] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-[#183035] transition-colors cursor-pointer"
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
                    className="hover:scale-125 transition-transform text-xs p-0.5 cursor-pointer"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete comment?"
        description="Are you sure you want to permanently delete this comment? This action cannot be undone."
        confirmLabel="Delete Comment"
        isDestructive={true}
        isLoading={deleteComment.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};
