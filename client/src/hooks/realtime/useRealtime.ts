import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { create } from "zustand";
export const useRealtimeState = create<{
  status: "connecting" | "live" | "offline";
}>(() => ({ status: "connecting" }));
export function useRealtime() {
  const token = useAuthStore((s) => s.token),
    cache = useQueryClient();
  useEffect(() => {
    if (!token) return;
    let stopped = false,
      socket: WebSocket | undefined,
      retry: ReturnType<typeof setTimeout> | undefined,
      batch: ReturnType<typeof setTimeout> | undefined,
      attempt = 0;
    const projects = new Set<string>();
    let resync = false;
    const refresh = () => {
      if (batch) return;
      batch = setTimeout(() => {
        batch = undefined;
        const ids = new Set(projects);
        projects.clear();
        const all = resync;
        resync = false;
        void cache.invalidateQueries({
          predicate: (q) => {
            if (all) return q.queryKey[0] !== "auth";
            const root = String(q.queryKey[0]);
            return (
              q.queryKey.some((v) => typeof v === "string" && ids.has(v)) ||
              [
                "cards",
                "comments",
                "checklists",
                "customFields",
                "timeLogs",
                "activities",
                "notifications",
                "search",
                "workspaces",
                "projects",
                "productivity",
              ].includes(root)
            );
          },
          refetchType: "active",
        });
      }, 50);
    };
    const connect = () => {
      if (stopped) return;
      useRealtimeState.setState({ status: "connecting" });
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/v1/realtime/socket`,
      );
      socket.onopen = () => socket?.send(JSON.stringify({ token }));
      socket.onmessage = (e) => {
        if (stopped) return;
        try {
          const event = JSON.parse(String(e.data)) as {
            kind: string;
            project_id?: string;
          };
          if (event.kind === "permissions_changed") {
            void cache.resetQueries();
          } else if (event.kind === "connected") {
            attempt = 0;
            useRealtimeState.setState({ status: "live" });
            resync = true;
            refresh();
          } else {
            if (event.project_id) projects.add(event.project_id);
            else resync = true;
            refresh();
          }
        } catch {
          /* Ignore malformed frames; API data remains authoritative. */
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        useRealtimeState.setState({ status: "offline" });
        if (!stopped)
          retry = setTimeout(
            connect,
            Math.min(15000, 500 * 2 ** attempt++) + Math.random() * 300,
          );
      };
      socket.onerror = () => socket?.close();
    };
    const online = () => {
      if (socket?.readyState === WebSocket.CLOSED) {
        clearTimeout(retry);
        connect();
      }
    };
    retry = setTimeout(connect, 0);
    window.addEventListener("online", online);
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearTimeout(batch);
      window.removeEventListener("online", online);
      socket?.close();
    };
  }, [token, cache]);
}
