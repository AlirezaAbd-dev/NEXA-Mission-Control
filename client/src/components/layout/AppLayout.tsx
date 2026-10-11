import { Outlet, Navigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from '@/components/common/CommandPalette';
import { CardDetailModal } from '@/features/card/CardDetailModal';
import { useAuthStore } from '@/stores/auth.store';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';

export const AppLayout = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useCurrentUser(); // Bootstrap current user profile

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 h-screen overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
      <CardDetailModal />
    </div>
  );
};
