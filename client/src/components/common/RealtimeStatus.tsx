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
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
        isLive
          ? "bg-[var(--nexa-status-success-surface)] text-[var(--nexa-status-success-text)]"
          : "bg-[var(--nexa-status-warning-surface)] text-[var(--nexa-status-warning-text)]"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 bg-current ${
          isLive ? "animate-pulse" : ""
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
