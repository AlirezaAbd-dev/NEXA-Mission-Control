import { formatNumber } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
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
  useUiLocale();
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
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <span>{tr("Activity & Comments (")}{formatNumber(comments.length)})</span>
      </div>

      {/* New Comment Input */}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={tr("Write a comment...")}
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
            <Send className="w-3.5 h-3.5 me-1.5" />{tr("Comment")}</Button>
        </div>
        {admin && (
          <Checkbox
            checked={internal}
            onChange={setInternal}
            label={tr("Internal · visible to project administrators")}
          />
        )}
      </form>

      {/* Comment List */}
      {isLoading ? (
        <div className="text-xs text-muted-foreground animate-pulse">{tr("Loading comments...")}</div>
      ) : comments.length === 0 ? (
        <div className="text-xs text-muted-foreground italic py-2">{tr("No comments yet.")}</div>
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
  useUiLocale();
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
      setEditError(tr("Comment cannot be empty"));
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
      <div className="group relative flex items-start gap-3 p-3 rounded-xl bg-[var(--nexa-surface-l2)] border border-[var(--nexa-divider)] transition-colors hover:border-primary/30">
        <UserAvatar
          displayName={comment.author_name}
          avatarUrl={comment.author_avatar}
          size="sm"
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header: Author + Timestamp + Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-xs font-semibold text-foreground truncate">
                {comment.author_name}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatRelativeTime(comment.created_at)}
              </span>
              {comment.edited_at && (
                <span
                  className="text-[10px] text-muted-foreground italic select-none"
                  title={
                    comment.edited_at
                      ? tr("Edited {value0}", { value0: (formatRelativeTime(comment.edited_at)) })
                      : tr("Edited")
                  }
                >{tr("· edited")}</span>
              )}
              {comment.is_internal && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-warning/10 text-warning font-medium border border-warning/20">{tr("Internal")}</span>
              )}
            </div>

            {/* Action buttons (Edit & Delete) */}
            {!isEditing && (canEdit || canDelete) && (
              <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-[var(--nexa-surface-l3)] transition-colors cursor-pointer"
                    title={tr("Edit comment")}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(true)}
                    className="p-1 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                    title={tr("Delete comment")}
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
                <p role="alert" className="text-xs text-danger">
                  {editError}
                </p>
              )}
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                autoFocus
                placeholder={tr("Edit your comment...")}
                className="w-full resize-none text-sm"
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-muted-foreground hidden sm:inline">{tr("Esc to cancel · ⌘+Enter to save")}</span>
                <div className="flex items-center gap-1.5 ms-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={updateComment.isPending}
                  >
                    <X className="w-3.5 h-3.5 me-1" />{tr("Cancel")}</Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSaveEdit}
                    isLoading={updateComment.isPending}
                    disabled={!editText.trim()}
                  >
                    <Check className="w-3.5 h-3.5 me-1" />{tr("Save")}</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-foreground">
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--nexa-surface-l3)] hover:bg-[var(--nexa-surface-l1)] text-foreground border border-[var(--nexa-divider)] transition-colors cursor-pointer"
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-[11px] font-medium">{formatNumber(reaction.count)}</span>
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
                    title={tr("React with {value0}", { value0: (emoji) })}
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
        title={tr("Delete comment?")}
        description={tr("Are you sure you want to permanently delete this comment? This action cannot be undone.")}
        confirmLabel={tr("Delete Comment")}
        isDestructive={true}
        isLoading={deleteComment.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};
