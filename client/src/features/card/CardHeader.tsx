import { useState, useRef, useEffect } from "react";
import { Palette, FileText, Pencil, X, Check } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useUpdateCard } from "@/hooks/card/useUpdateCard";
import { CardRemoveButton } from "./CardRemoveButton";
import { CardWatchers } from "./CardWatchers";
import { CardVoteButton } from "./CardVoteButton";
import type { Card } from "@/types";
interface CardHeaderProps {
  card: Card;
  onClose?: () => void;
}
const colors = [
  ["#0d9488", "Teal"],
  ["#2dd4bf", "Mint"],
  ["#3b82f6", "Blue"],
  ["#8b5cf6", "Violet"],
  ["#ec4899", "Pink"],
  ["#ef4444", "Red"],
  ["#f97316", "Orange"],
  ["#eab308", "Amber"],
  ["#10b981", "Emerald"],
  ["#64748b", "Slate"],
];
export function CardHeader({ card, onClose }: CardHeaderProps) {
  const [editing, setEditing] = useState(false),
    [title, setTitle] = useState(card.title),
    [palette, setPalette] = useState(false);
  const titleControl = useRef<HTMLButtonElement>(null);
  const picker = useRef<HTMLDivElement>(null),
    cancel = useRef(false),
    update = useUpdateCard(card.project_id);
  useEffect(() => {
    if (!palette) return;
    const close = (event: PointerEvent) => {
      if (!picker.current?.contains(event.target as Node)) setPalette(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [palette]);
  const commit = () => {
    setEditing(false);
    if (cancel.current) {
      cancel.current = false;
      return;
    }
    if (title.trim() && title.trim() !== card.title)
      update.mutate({ id: card.id, title: title.trim() });
    else setTitle(card.title);
  };
  const hasCover = !!card.cover_url;
  return (
    <header className="relative border-b border-border bg-card">
      {hasCover && (
        <div
          className="h-16 sm:h-20 w-full overflow-hidden"
          style={
            card.cover_url?.startsWith("#")
              ? { backgroundColor: card.cover_url }
              : undefined
          }
        >
          {!card.cover_url?.startsWith("#") && (
            <img
              src={card.cover_url!}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
      )}
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close modal"
          title="Close (Esc)"
          onClick={onClose}
          className="absolute top-3 end-3 z-30 h-9 w-9 rounded-xl border border-border bg-card/95 text-foreground shadow-sm hover:bg-muted"
        >
          <X size={17} />
        </Button>
      )}
      <div
        className={
          "p-4 sm:px-6 sm:py-4 space-y-3 " + (!hasCover ? "pe-16 sm:pe-16" : "")
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center flex-wrap gap-2">
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-mono font-semibold text-primary">
              CARD-{card.id.slice(-6).toUpperCase()}
            </span>
            {card.is_template && (
              <span className="text-xs flex items-center gap-1 text-primary">
                <FileText size={12} />
                Template
              </span>
            )}
            {card.archived_at && (
              <span className="text-xs text-warning">Archived</span>
            )}
            <div
              ref={picker}
              className="relative"
              onKeyDown={(e) => {
                if (e.key === "Escape" && palette) {
                  e.stopPropagation();
                  setPalette(false);
                }
              }}
            >
              <Button
                size="sm"
                variant="ghost"
                aria-expanded={palette}
                aria-label="Choose task cover"
                onClick={() => setPalette((v) => !v)}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                <Palette size={13} />
                Cover
              </Button>
              {palette && (
                <div className="absolute start-0 top-full mt-2 z-40 w-60 rounded-2xl border border-border bg-card text-foreground p-3 shadow-xl">
                  <p className="text-xs font-semibold mb-3">Cover color</p>
                  <div className="grid grid-cols-5 gap-2">
                    {colors.map(([color, name]) => (
                      <Button
                        key={color}
                        size="icon"
                        aria-label={name + " cover"}
                        aria-pressed={card.cover_url === color}
                        title={name}
                        onClick={() => {
                          update.mutate({ id: card.id, cover_url: color });
                          setPalette(false);
                        }}
                        className="h-8 w-8 rounded-lg border border-black/10 text-white"
                        style={{ backgroundColor: color }}
                      >
                        {card.cover_url === color && <Check size={16} />}
                      </Button>
                    ))}
                  </div>
                  {hasCover && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-3 w-full"
                      onClick={() => {
                        update.mutate({ id: card.id, cover_url: "" });
                        setPalette(false);
                      }}
                    >
                      Remove cover
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CardWatchers card={card} />
            <CardVoteButton card={card} />
            <CardRemoveButton card={card} onRemoved={onClose} />
          </div>
        </div>
        {editing ? (
          <Input
            aria-label="Task title"
            value={title}
            maxLength={255}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
                requestAnimationFrame(() => titleControl.current?.focus());
              } else if (e.key === "Escape") {
                e.stopPropagation();
                cancel.current = true;
                e.currentTarget.blur();
                requestAnimationFrame(() => titleControl.current?.focus());
              }
            }}
            className="font-semibold"
          />
        ) : (
          <h2 className="min-w-0">
            <Button
              ref={titleControl}
              variant="ghost"
              disabled={update.isPending}
              onClick={() => {
                cancel.current = false;
                setTitle(card.title);
                setEditing(true);
              }}
              title="Edit task title"
              className="h-auto min-h-9 w-full justify-start px-0 hover:bg-transparent gap-2 text-start text-lg sm:text-xl font-bold whitespace-normal leading-snug"
            >
              <span className="min-w-0 break-words">{card.title}</span>
              <Pencil size={14} className="shrink-0 text-muted-foreground" />
            </Button>
          </h2>
        )}
      </div>
    </header>
  );
}
