import { useSyncExternalStore } from "react";
import { fa } from "./fa";

export type Locale = "en" | "fa";
const key = "mission_control_locale";
const listeners = new Set<() => void>();
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(key);
    if (saved === "en" || saved === "fa") return saved;
  } catch { /* Storage can be unavailable in private browsing. */ }
  return typeof navigator !== "undefined" && navigator.language.startsWith("fa") ? "fa" : "en";
}
let locale = initialLocale();
export function getLocale(): Locale { return locale; }
export function dateLocale() { return locale === "fa" ? "fa-IR-u-ca-gregory" : "en-US"; }
export function numberLocale() { return locale === "fa" ? "fa-IR" : "en-US"; }
function applyDocumentLocale() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
}
export function setLocale(next: Locale) {
  if (next !== "fa" && next !== "en") return;
  locale = next;
  try { localStorage.setItem(key, next); } catch { /* In-memory switching still works. */ }
  applyDocumentLocale();
  for (const notify of listeners) notify();
}
applyDocumentLocale();
if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("storage", event => {
  if (event.key === key && (event.newValue === "en" || event.newValue === "fa")) setLocale(event.newValue);
});
function subscribe(notify: () => void) { listeners.add(notify); return () => { listeners.delete(notify); }; }
export function useUiLocale() { return useSyncExternalStore(subscribe, getLocale, () => "en" as Locale); }
export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(numberLocale(), options).format(value);
}
export function tr(source: string, values?: Record<string, unknown>): string {
  const text = locale === "fa" ? fa[source] ?? source : source;
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value == null ? match : typeof value === "number" ? formatNumber(value) : String(value);
  });
}
// Only for application-owned enum values, never record names or user content.
export function uiLabel(value: string): string {
  const labels: Record<string, string> = { no_priority: "No priority", admin: "Admin", owner: "Owner", member: "Member", viewer: "Viewer", in_progress: "In progress", todo: "To do", done: "Done", planned: "Planned", resolved: "Resolved", closed: "Closed", open: "Open", draft: "Draft", assignee: "Assignee", priority: "Priority", label: "Label", none: "None", days: "Days", weeks: "Weeks", months: "Months", epic: "Epic", epics: "Epics", release: "Release", releases: "Releases", documents: "Documents" };
  return tr(labels[value] || value.replaceAll("_", " ").replace(/^\w/, letter => letter.toUpperCase()));
}
export function normalizeSearch(value: string): string {
  return value.normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").toLocaleLowerCase().trim();
}
