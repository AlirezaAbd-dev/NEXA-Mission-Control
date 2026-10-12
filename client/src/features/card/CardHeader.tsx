import React, { useState } from "react";
import { Palette, FileText } from "lucide-react";
import { useUpdateCard } from "@/hooks/card/useUpdateCard";
import { CardWatchers } from "./CardWatchers";
import { CardVoteButton } from "./CardVoteButton";
import type { Card } from "@/types";

interface CardHeaderProps {
  card: Card;
  onClose?: () => void;
}

const COVER_COLORS = [
  "#0d9488", // Teal
  "#2dd4bf", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Amber
  "#10b981", // Emerald
  "#64748b", // Slate
];

export const CardHeader: React.FC<CardHeaderProps> = ({
  card,
  onClose: _onClose,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [showColorPicker, setShowColorPicker] = useState(false);
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
    if (e.key === "Enter") {
      handleTitleSubmit();
    } else if (e.key === "Escape") {
      setTitle(card.title);
      setIsEditingTitle(false);
    }
  };

  const handleSetColorCover = (color: string) => {
    updateCard.mutate({
      id: card.id,
      cover_url: card.cover_url === color ? "" : color,
    });
    setShowColorPicker(false);
  };

  const hasColorCover = card.cover_url && card.cover_url.startsWith("#");
  const hasImageCover = card.cover_url && !card.cover_url.startsWith("#");

  return (
    <div className="space-y-3">
      {/* Visual Cover Banner if Active */}
      {hasColorCover && (
        <div
          className="h-24 -mx-6 -mt-6 mb-3 rounded-t-xl transition-all shadow-inner relative"
          style={{ backgroundColor: card.cover_url! }}
        />
      )}

      {hasImageCover && (
        <div className="h-44 -mx-6 -mt-6 mb-3 rounded-t-xl overflow-hidden bg-slate-100 dark:bg-[#070e10] relative">
          <img
            src={card.cover_url!}
            alt={card.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="pb-3 border-b border-slate-200/80 dark:border-[#183035] pr-10">
        <div className="flex items-center gap-2 mb-2 flex-wrap justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#132428] text-slate-600 dark:text-teal-400 border border-slate-200/60 dark:border-[#183035] uppercase">
              CARD-{card.id.slice(0, 6)}
            </span>

            {card.is_template && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-500 font-semibold border border-teal-500/20 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Template
              </span>
            )}

            {card.archived_at && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                Archived
              </span>
            )}

            {/* Quick Cover Palette Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="text-[11px] px-2.5 py-0.5 rounded-md flex items-center gap-1.5 bg-slate-100 dark:bg-[#132428] text-slate-600 dark:text-slate-300 hover:text-teal-500 border border-slate-200/60 dark:border-[#183035] transition-colors cursor-pointer font-medium"
                title="Change Cover Color"
              >
                <Palette className="w-3 h-3 text-teal-500" />
                <span>Cover</span>
              </button>

              {showColorPicker && (
                <div className="absolute z-50 left-0 mt-1 p-2 bg-white dark:bg-[#0d1a1d] border border-slate-200 dark:border-[#183035] rounded-xl shadow-xl flex gap-1.5 flex-wrap w-44 animate-in fade-in zoom-in-95 duration-100">
                  {COVER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleSetColorCover(c)}
                      className="w-6 h-6 rounded-md transition-transform hover:scale-110 border border-black/10 cursor-pointer"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  {card.cover_url && (
                    <button
                      type="button"
                      onClick={() => handleSetColorCover("")}
                      className="w-full text-center text-[10px] text-slate-400 hover:text-rose-500 pt-1 cursor-pointer font-medium"
                    >
                      Clear Cover
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Productivity actions: Watchers & Votes */}
          <div className="flex items-center gap-2">
            <CardWatchers card={card} />
            <CardVoteButton card={card} />
          </div>
        </div>

        {isEditingTitle ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full text-xl font-bold bg-white dark:bg-[#091316] text-slate-900 dark:text-slate-100 border border-teal-500/50 dark:border-teal-500/60 rounded-lg px-2.5 py-1 outline-none ring-2 ring-teal-500/20"
          />
        ) : (
          <h2
            onClick={() => {
              setTitle(card.title);
              setIsEditingTitle(true);
            }}
            className="text-xl font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-[#132428] rounded-lg px-2 py-1 -mx-2 transition-colors tracking-tight"
          >
            {card.title}
          </h2>
        )}
      </div>
    </div>
  );
};
