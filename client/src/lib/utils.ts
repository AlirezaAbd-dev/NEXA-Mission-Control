import { dateLocale, getLocale } from "@/i18n";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(dateLocale(), {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString(dateLocale(), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  const relative = new Intl.RelativeTimeFormat(getLocale() === "fa" ? "fa-IR" : "en-US", { numeric: "auto" });
  if (diffSec < 60) return relative.format(0, "second");
  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  return relative.format(-Math.floor(hours / 24), "day");
}

export function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800';
    case 'high':
      return 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800';
    case 'medium':
      return 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800';
    case 'low':
      return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  }
}
