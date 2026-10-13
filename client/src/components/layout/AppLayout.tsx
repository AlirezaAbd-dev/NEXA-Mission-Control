import { useDesktopNotifications } from "@/hooks/notification/useDesktopNotifications";
import { useRealtime } from "@/hooks/realtime/useRealtime";
import { KeyboardShortcuts } from "@/features/card/KeyboardShortcuts";
import { Outlet, Navigate } from "react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/common/CommandPalette";
import { CardDetailModal } from "@/features/card/CardDetailModal";
import { useAuthStore } from "@/stores/auth.store";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";

export const AppLayout = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useRealtime();
  useDesktopNotifications();
  useCurrentUser(); // Bootstrap current user profile

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen h-[100dvh] w-screen overflow-hidden bg-slate-50 dark:bg-[#070e10] text-slate-900 dark:text-slate-100">
      <Sidebar />
      <div className="flex flex-col flex-1 h-screen h-[100dvh] overflow-hidden min-w-0 bg-slate-50/50 dark:bg-[#070e10]/50">
        <TopBar />
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
      <CardDetailModal />
      <KeyboardShortcuts />
    </div>
  );
};
