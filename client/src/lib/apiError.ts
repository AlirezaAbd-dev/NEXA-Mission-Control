import { isAxiosError } from "axios";
export function apiError(error: unknown): string {
  return isAxiosError(error)
    ? error.response?.data?.error?.message || error.message
    : error instanceof Error
      ? error.message
      : "The action failed. Please try again.";
}
