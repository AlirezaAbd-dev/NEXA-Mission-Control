export function dueLabel(value: string | null) {
  if (!value) return "No due date";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? "No due date" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
