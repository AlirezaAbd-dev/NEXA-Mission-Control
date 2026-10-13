import { RealtimeStatus } from "@/components/common/RealtimeStatus";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Sun, Moon, PanelLeft, LogOut, User } from "lucide-react";
import { useUiStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { NotificationBell } from "@/components/common/NotificationBell";
import { NexaLogo } from "@/components/common/NexaLogo";
import { Dropdown, Avatar } from "@/components/ui";
import { useNavigate } from "react-router";

export const TopBar = () => {
  const cache = useQueryClient();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const currentUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    cache.clear();
    useUiStore.getState().closeCardModal();
    useUiStore.getState().setCommandPaletteOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <header className="h-14 bg-white dark:bg-[#0d1a1d] border-b border-slate-200 dark:border-[#183035] flex items-center justify-between px-3 sm:px-4 z-20 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-muted transition-colors shrink-0"
          title="Toggle Sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 md:hidden shrink-0">
          <NexaLogo size={22} className="shrink-0" />
          <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-100">
            NEXA
          </span>
        </div>

        {/* Global search trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-muted text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs w-9 sm:w-52 md:w-64 justify-center sm:justify-start transition-colors shrink-0 sm:shrink"
          title="Search tasks (⌘K)"
        >
          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span className="truncate hidden sm:inline">Search tasks...</span>
          <kbd className="ml-auto text-[10px] bg-white dark:bg-muted px-1.5 py-0.5 rounded text-slate-500 shadow-2xs hidden md:inline-block">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-muted transition-colors"
          title="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Notifications */}
        <RealtimeStatus />
        <NotificationBell />

        {/* User Dropdown */}
        <Dropdown
          trigger={
            <div className="flex items-center gap-2 pl-1 sm:pl-2 cursor-pointer">
              <Avatar
                src={currentUser?.avatar_url}
                name={currentUser?.display_name || currentUser?.username}
                size="sm"
              />
            </div>
          }
          items={[
            {
              id: "profile",
              label: currentUser?.display_name || "My Profile",
              icon: <User className="w-3.5 h-3.5" />,
              onClick: () => navigate("/settings"),
            },
            {
              id: "logout",
              label: "Sign Out",
              icon: <LogOut className="w-3.5 h-3.5" />,
              danger: true,
              onClick: handleLogout,
            },
          ]}
        />
      </div>
    </header>
  );
};
