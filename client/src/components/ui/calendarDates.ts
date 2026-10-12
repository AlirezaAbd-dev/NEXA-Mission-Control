export function parseCalendarValue(value?: string | null): Date | null {
  if (!value) return null;
  // Date-only values are local calendar days, never UTC midnight.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(value + "T00:00:00")
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && calendarValue(date) !== value)
    return null;
  return date;
}
export function calendarValue(date: Date, includeTime = false): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day =
    String(date.getFullYear()) +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate());
  return includeTime
    ? day + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes())
    : day;
}
export function withinDateBounds(
  date: Date,
  min?: string,
  max?: string,
  includeTime = false,
): boolean {
  const candidate = calendarValue(date, includeTime);
  return (
    (!min || candidate >= min.slice(0, includeTime ? 16 : 10)) &&
    (!max || candidate <= max.slice(0, includeTime ? 16 : 10))
  );
}
