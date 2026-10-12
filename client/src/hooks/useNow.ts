import { useSyncExternalStore } from "react";
let current = Date.now();
let interval: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!interval)
    interval = setInterval(() => {
      current = Date.now();
      for (const notify of listeners) notify();
    }, 30000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && interval) {
      clearInterval(interval);
      interval = undefined;
    }
  };
}
const snapshot = () => current;
export function useNow() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
