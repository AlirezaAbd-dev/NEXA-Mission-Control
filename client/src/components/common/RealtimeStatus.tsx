import { tr, useUiLocale } from "@/i18n";
import { useRealtimeState } from "@/hooks/realtime/useRealtime";

export function RealtimeStatus() {
  useUiLocale();
  const status = useRealtimeState((s) => s.status);
  const isLive = status === "live";

  return (
    <span
      role="status"
      title={tr("Realtime: {value0}", { value0: (status === "live" ? tr("Live") : status === "connecting" ? tr("Connecting…") : tr("Reconnecting…")) })}
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 sm:px-2.5 rounded-full ${
        isLive
          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
          : "text-amber-600 dark:text-amber-400 bg-amber-500/10"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
        }`}
      />
      <span className="hidden sm:inline">
        {status === "live"
          ? tr("Live")
          : status === "connecting"
            ? tr("Connecting…")
            : tr("Reconnecting…")}
      </span>
    </span>
  );
}
