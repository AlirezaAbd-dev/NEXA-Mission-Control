import type { Card } from "@/types";
export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const parseDay = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`);
export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
export const daysBetween = (a: Date, b: Date) =>
  Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86400000,
  );
export function reschedule(
  card: Pick<Card, "id" | "start_date" | "due_date">,
  target: string,
) {
  const due = card.due_date ? parseDay(card.due_date) : parseDay(target);
  const delta = daysBetween(due, parseDay(target));
  return {
    id: card.id,
    due_date: target,
    ...(card.start_date
      ? { start_date: dateKey(addDays(parseDay(card.start_date), delta)) }
      : {}),
  };
}
export const priorities = ["urgent", "high", "medium", "low", "no_priority"];
