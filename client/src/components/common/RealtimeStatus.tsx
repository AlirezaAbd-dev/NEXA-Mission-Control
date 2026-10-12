import { useRealtimeState } from "@/hooks/realtime/useRealtime";
export function RealtimeStatus() {
  const status = useRealtimeState((s) => s.status);
  return (
    <span
      role="status"
      className={`text-xs px-2 py-1 rounded-full ${status === "live" ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : "text-amber-600 dark:text-amber-400 bg-amber-500/10"}`}
    >
      {status === "live"
        ? "Live"
        : status === "connecting"
          ? "Connecting…"
          : "Reconnecting…"}
    </span>
  );
}
