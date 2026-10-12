import { useEffect } from "react";
import { Button } from "@/components/ui";
import { useUiStore } from "@/stores/ui.store";
export function MutationFeedback() {
  const message = useUiStore((s) => s.mutationError),
    clear = useUiStore((s) => s.setMutationError);
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => clear(null), 12000);
    return () => clearTimeout(timeout);
  }, [message, clear]);
  return message ? (
    <aside
      role="alert"
      className="fixed bottom-5 end-5 z-[100] max-w-md p-4 rounded-xl bg-white dark:bg-[#0d1a1d] text-rose-600 dark:text-rose-300 border border-rose-500/30 shadow-xl flex items-start gap-3"
    >
      <p className="text-sm">{message}</p>
      <Button
        size="sm"
        variant="ghost"
        aria-label="Dismiss error"
        onClick={() => clear(null)}
      >
        ×
      </Button>
    </aside>
  ) : null;
}
