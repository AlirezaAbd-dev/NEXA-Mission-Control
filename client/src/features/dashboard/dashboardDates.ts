import { tr, dateLocale } from "@/i18n";
export function dueLabel(value: string | null) {
  if (!value) return tr("No due date");
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? tr("No due date") : date.toLocaleDateString(dateLocale(), { month: "short", day: "numeric" });
}
