import { useDesktopNotifications } from "@/hooks/notification/useDesktopNotifications";
import { useRealtime } from "@/hooks/realtime/useRealtime";
import { KeyboardShortcuts } from "@/features/card/KeyboardShortcuts";
import { Outlet, Navigate } from "react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/common/CommandPalette";
import { CardDetailModal } from "@/features/card/CardDetailModal";
import { ReleaseUpdateBanner } from "@/components/common/ReleaseUpdateBanner";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";

export const AppLayout = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  useRealtime();
  useDesktopNotifications();
  useCurrentUser(); // Bootstrap current user profile

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      data-nexa-surface="app"
      className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-[var(--nexa-surface-l0)] text-foreground"
    >
      <div
        data-nexa-shell={sidebarCollapsed ? "collapsed" : "expanded"}
        className="relative flex h-full w-full overflow-hidden"
      >
        <Sidebar />
        <div className="nexa-shell-main flex flex-col flex-1 h-full overflow-hidden min-w-0 transition-[padding] duration-300 motion-reduce:transition-none">
          <TopBar />
          <ReleaseUpdateBanner />
          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col">
            <Outlet />
          </main>
        </div>
      </div>

      <CommandPalette />
      <CardDetailModal />
      <KeyboardShortcuts />
    </div>
  );
};
