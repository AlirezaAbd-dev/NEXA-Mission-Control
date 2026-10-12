import { useNow } from "@/hooks/useNow";
export function SlaCountdown({
  label,
  deadline,
  completed,
}: {
  label: string;
  deadline?: string | null;
  completed?: string | null;
}) {
  const now = useNow();
  if (!deadline) return null;
  const end = new Date(deadline).getTime(),
    finished = completed ? new Date(completed).getTime() : null,
    remaining = end - now;
  const minutes = Math.ceil(Math.abs(remaining) / 60000),
    days = Math.floor(minutes / 1440),
    hours = Math.floor((minutes % 1440) / 60),
    rest = minutes % 60;
  const status =
    finished !== null
      ? finished <= end
        ? "Met"
        : "Completed late"
      : remaining < 0
        ? "Breached"
        : "Remaining";
  return (
    <p
      className={`text-xs ${status === "Breached" || status === "Completed late" ? "text-rose-500" : "text-teal-600 dark:text-teal-400"}`}
    >
      {label}: {status}
      {finished === null
        ? ` · ${days ? `${days}d ` : ""}${hours}h ${rest}m`
        : ""}
    </p>
  );
}
