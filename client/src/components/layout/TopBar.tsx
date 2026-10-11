import { Search, Sun, Moon, PanelLeft, LogOut, User } from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { NotificationBell } from '@/components/common/NotificationBell';
import { Dropdown, Avatar } from '@/components/ui';
import { useNavigate } from 'react-router';

export const TopBar = () => {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const currentUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-20 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Global search trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs w-48 sm:w-64 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="truncate">Search tasks...</span>
          <kbd className="ml-auto text-[10px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* User Dropdown */}
        <Dropdown
          trigger={
            <div className="flex items-center gap-2 pl-2 cursor-pointer">
              <Avatar
                src={currentUser?.avatar_url}
                name={currentUser?.display_name || currentUser?.username}
                size="sm"
              />
            </div>
          }
          items={[
            {
              id: 'profile',
              label: currentUser?.display_name || 'My Profile',
              icon: <User className="w-3.5 h-3.5" />,
              onClick: () => navigate('/settings'),
            },
            {
              id: 'logout',
              label: 'Sign Out',
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
