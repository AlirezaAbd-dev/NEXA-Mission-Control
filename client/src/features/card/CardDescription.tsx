import { Markdown } from "@/components/common/Markdown";
import React, { useState } from "react";
import { AlignLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useUpdateCard } from "@/hooks/card/useUpdateCard";
import type { Card } from "@/types";

interface CardDescriptionProps {
  card: Card;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ card }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(card.description || "");
  const updateCard = useUpdateCard(card.project_id);

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

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <AlignLeft className="w-4 h-4 text-slate-400" />
        <span>Description</span>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a more detailed description..."
            rows={4}
            className="w-full resize-none"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              isLoading={updateCard.isPending}
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
          className={`p-3 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-border cursor-pointer transition-colors text-sm ${
            card.description
              ? "text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-card/50 whitespace-pre-wrap"
              : "text-slate-400 bg-slate-50/50 dark:bg-card/30 hover:bg-slate-100 dark:hover:bg-muted/50 italic"
          }`}
        >
          {card.description ? (
            <Markdown text={card.description} />
          ) : (
            "Add a detailed description…"
          )}
        </div>
      )}
    </div>
  );
};
