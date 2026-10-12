import React, { useState } from "react";
import { AlignLeft, Check, X, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { useUpdateCard } from "@/hooks/card/useUpdateCard";
import { useUploadAttachment } from "@/hooks/enterprise/useUploadAttachment";
import type { Card } from "@/types";

interface CardDescriptionProps {
  card: Card;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ card }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(card.description || "");
  const updateCard = useUpdateCard(card.project_id);
  const uploadAttachment = useUploadAttachment(card.project_id, card.id);

  const handleSave = () => {
    updateCard.mutate(
      {
        id: card.id,
        description: description.trim(),
      },
      {
        onSuccess: () => setIsEditing(false),
      },
    );
  };

  const handleCancel = () => {
    setDescription(card.description || "");
    setIsEditing(false);
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const attachment = await uploadAttachment.mutateAsync(file);
    return attachment.file_path;
  };

  const hasDescription = Boolean(card.description && card.description.trim());

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-2">
          <AlignLeft className="w-4 h-4 text-teal-500" />
          <span>Description</span>
        </div>
        {!isEditing && hasDescription && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDescription(card.description || "");
              setIsEditing(true);
            }}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1 text-teal-500" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2.5">
          <RichTextEditor
            content={description}
            onChange={(val) => setDescription(val)}
            onImageUpload={handleImageUpload}
            placeholder="Add rich description, paste or drop images, checklists, code, tables..."
            minHeight="220px"
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleSave}
              isLoading={updateCard.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
            >
              <Check className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => {
            setDescription(card.description || "");
            setIsEditing(true);
          }}
          className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
            hasDescription
              ? "border-border/60 bg-card/60 dark:bg-card/40 hover:border-primary/50 hover:bg-card text-foreground"
              : "border-dashed border-border/80 bg-muted/20 dark:bg-card/20 hover:border-primary/60 hover:bg-muted/40 text-muted-foreground italic text-sm"
          }`}
        >
          {hasDescription ? (
            <div
              className="prose prose-sm dark:prose-invert tiptap-content max-w-none text-sm break-words leading-relaxed overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: card.description! }}
            />
          ) : (
            <div className="flex items-center gap-2 py-1 text-muted-foreground">
              <span>Add a rich description, paste images, tables, checklists…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

