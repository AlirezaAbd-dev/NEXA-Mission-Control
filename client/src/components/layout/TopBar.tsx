import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { tr, useUiLocale } from "@/i18n";
import { RealtimeStatus } from "@/components/common/RealtimeStatus";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Sun, Moon, Menu, LogOut, User, Settings } from "lucide-react";
import { useUiStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { NotificationBell } from "@/components/common/NotificationBell";
import { NexaLogo } from "@/components/common/NexaLogo";
import { Dropdown, Avatar } from "@/components/ui";
import { useNavigate } from "react-router";

export const TopBar = () => {
  useUiLocale();
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
    <header
      data-nexa-header-controls=""
      className="h-14 lg:h-16 bg-[var(--nexa-surface-l0)]/85 backdrop-blur-md border-b border-[var(--nexa-divider)] flex items-center justify-between px-3 sm:px-5 z-20 shrink-0"
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex lg:hidden nexa-header-icon nexa-tonal-action items-center justify-center rounded-xl text-muted-foreground hover:text-primary transition-colors shrink-0 cursor-pointer"
          title={tr("Toggle Sidebar")}
          aria-label={tr("Toggle Sidebar")}
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        <div className="hidden min-[420px]:flex items-center gap-2 lg:hidden shrink-0">
          <NexaLogo size={24} className="shrink-0" />
          <span className="text-xs font-bold tracking-tight text-foreground">
            NEXA
          </span>
        </div>

        {/* Global search trigger */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 rounded-xl nexa-tonal-action text-muted-foreground hover:text-foreground text-xs w-9 sm:w-56 md:w-64 justify-center sm:justify-start transition-colors shrink-0 sm:shrink cursor-pointer"
          title={tr("Search tasks (⌘K)")}
        >
          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span className="truncate hidden sm:inline">{tr("Search tasks...")}</span>
          <kbd className="ms-auto text-[10px] bg-[var(--nexa-surface-l1)] px-1.5 py-0.5 rounded text-muted-foreground hidden md:inline-block">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <RealtimeStatus />
        <LanguageSwitcher />
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex nexa-header-icon nexa-tonal-action items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title={tr("Toggle Theme")}
          aria-label={tr("Toggle Theme")}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* User Dropdown */}
        <Dropdown
          trigger={
            <div className="flex items-center gap-2 px-1.5 h-9 rounded-xl nexa-tonal-action cursor-pointer transition-colors">
              <Avatar
                src={currentUser?.avatar_url}
                name={currentUser?.display_name || currentUser?.username}
                size="sm"
              />
              <span className="hidden md:inline max-w-[110px] truncate text-xs font-semibold text-foreground pe-1">
                {currentUser?.display_name || currentUser?.username}
              </span>
            </div>
          }
          items={[
            {
              id: "profile",
              label: currentUser?.display_name || tr("My Profile"),
              icon: <User className="w-3.5 h-3.5" />,
              onClick: () => navigate("/settings"),
            },
            {
              id: "settings",
              label: tr("Settings & Workspace"),
              icon: <Settings className="w-3.5 h-3.5" />,
              onClick: () => navigate("/settings"),
            },
            {
              id: "logout",
              label: tr("Sign Out"),
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
