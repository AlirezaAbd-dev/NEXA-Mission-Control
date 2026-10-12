import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Modal, Input, Button } from "@/components/ui";
import { useUiStore } from "@/stores/ui.store";
import { useSearch } from "@/hooks/search/useSearch";
import { PriorityBadge } from "./PriorityBadge";
import { apiError } from "@/lib/apiError";
export function CommandPalette() {
  const isOpen = useUiStore((s) => s.commandPaletteOpen),
    setOpen = useUiStore((s) => s.setCommandPaletteOpen),
    openCard = useUiStore((s) => s.openCardModal);
  const [query, setQuery] = useState(""),
    [highlighted, setHighlighted] = useState(0);
  const { data: results = [], isLoading, error } = useSearch(query);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [isOpen, setOpen]);
  const select = (id: string) => {
    setOpen(false);
    openCard(id);
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setOpen(false)}
      title="Search your workspace"
      size="xl"
    >
      <div className="space-y-3">
        <div className="flex gap-2 items-center">
          <Search size={18} className="text-slate-500" />
          <Input
            aria-label="Search tasks"
            autoFocus
            value={query}
            placeholder="Search… priority:high status:active assignee:me"
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlighted(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlighted((i) => Math.min(results.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlighted((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter" && results[highlighted]) {
                e.preventDefault();
                select(results[highlighted].card_id);
              }
            }}
          />
        </div>
        <p className="text-[10px] text-slate-500">
          Combine priority:, status:, assignee:, label:, project:, and overdue:
          filters. ↑↓ to navigate · Enter to open.
        </p>
        {error && (
          <p role="alert" className="text-xs text-rose-500">
            {apiError(error)}
          </p>
        )}
        <div className="max-h-80 overflow-auto space-y-1">
          {isLoading ? (
            <p className="p-6 animate-pulse text-xs text-slate-500">
              Searching…
            </p>
          ) : query.trim().length < 2 ? (
            <p className="p-6 text-xs text-slate-500 text-center">
              Type at least two characters to search.
            </p>
          ) : results.length === 0 ? (
            <p className="p-6 text-xs text-slate-500 text-center">
              No matching tasks. Try a different query or filter.
            </p>
          ) : (
            results.map((item, i) => (
              <Button
                key={item.card_id}
                variant="ghost"
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full h-auto justify-between p-3 text-start ${highlighted === i ? "bg-teal-500/10" : ""}`}
                onClick={() => select(item.card_id)}
              >
                <span>
                  <span className="block text-sm font-medium">
                    {item.title}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {item.project_name}
                  </span>
                </span>
                <PriorityBadge priority={item.priority} />
              </Button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
