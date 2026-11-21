import { isAxiosError } from "axios";
import { getLocale, tr } from "@/i18n";
export function apiError(error: unknown): string {
  if (!isAxiosError(error)) return tr(error instanceof Error ? error.message : "The action failed. Please try again.");
  const message = error.response?.data?.error?.message || error.message;
  const translated = tr(message);
  if (getLocale() !== "fa" || translated !== message) return translated;
  if (!error.response) return tr("Could not connect to the server. Check your connection and retry.");
  const status = error.response.status;
  const fallbacks: Record<number, string> = {
    401: "Your session has expired. Please sign in again.", 403: "You do not have permission to perform this action.",
    404: "The requested item could not be found.", 409: "This record changed elsewhere. Reload it and try again.",
    429: "Too many requests. Please wait and try again.",
  };
  if (fallbacks[status]) return tr(fallbacks[status]);
  if (status >= 500) return tr("The server could not complete this action. Please try again.");
  // Preserve detailed server validation text until a matching translation is available.
  return message;
}
