import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';
import { useSearch } from '@/hooks/search/useSearch';
import { PriorityBadge } from '@/components/common/PriorityBadge';

export const CommandPalette = () => {
  const isOpen = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const openCardModal = useUiStore((s) => s.openCardModal);

  const [query, setQuery] = useState('');
  const { data: results = [], isLoading } = useSearch(query);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setOpen(false)}
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, descriptions, projects... (Cmd+K)"
            className="w-full px-3 py-3.5 text-sm bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/50">
          {query.trim().length < 2 ? (
            <p className="text-xs text-slate-400 text-center py-6">Type at least 2 characters to search</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No matching tasks found</p>
          ) : (
            results.map((item) => (
              <div
                key={item.card_id}
                onClick={() => {
                  setOpen(false);
                  openCardModal(item.card_id);
                }}
                className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {item.project_name}
                    </span>
                    {item.description && (
                      <span className="text-[11px] text-slate-400 truncate max-w-xs">
                        • {item.description}
                      </span>
                    )}
                  </div>
                </div>
                <PriorityBadge priority={item.priority} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
