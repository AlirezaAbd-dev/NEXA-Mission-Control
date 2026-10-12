import { useEffect, useRef } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import { useNotifications } from "./useNotifications";
export const useNotificationPreferences = create(
  persist<{
    enabled: Record<string, boolean>;
    setEnabled: (user: string, value: boolean) => void;
  }>(
    (set) => ({
      enabled: {},
      setEnabled: (user, value) =>
        set((s) => ({ enabled: { ...s.enabled, [user]: value } })),
    }),
    { name: "mission-notification-preferences" },
  ),
);
export function useDesktopNotifications() {
  const user = useAuthStore((s) => s.user?.id),
    enabled = useNotificationPreferences((s) => !!s.enabled[user || ""]),
    { data } = useNotifications(),
    seen = useRef<{ user?: string; ids: Set<string> }>({ ids: new Set() });
  useEffect(() => {
    if (!data || !user) return;
    if (seen.current.user !== user) {
      seen.current = { user, ids: new Set(data.map((n) => n.id)) };
      return;
    }
    const fresh = data.filter((n) => !seen.current.ids.has(n.id) && !n.read_at);
    seen.current.ids = new Set(data.map((n) => n.id));
    if (
      !enabled ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted" ||
      !document.hidden
    )
      return;
    for (const item of fresh.slice(0, 3)) {
      try {
        const notification = new Notification("Mission Control", {
          body: String(item.payload.message || item.type_.replaceAll("_", " ")),
          tag: item.id,
          icon: "/icon-192.png",
        });
        notification.onclick = () => {
          window.focus();
          if (typeof item.payload.card_id === "string")
            useUiStore.getState().openCardModal(item.payload.card_id);
          notification.close();
        };
      } catch {
        /* Some mobile browsers expose Notification without supporting its constructor. In-app alerts remain available. */
      }
    }
  }, [data, user, enabled]);
}
