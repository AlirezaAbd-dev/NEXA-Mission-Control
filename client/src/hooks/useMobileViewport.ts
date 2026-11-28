import { useCallback, useSyncExternalStore } from "react";

export function useMobileViewport(query = "(max-width: 767px)") {
  const subscribe = useCallback((callback: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
