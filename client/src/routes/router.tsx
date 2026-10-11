import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { BoardPage } from '@/features/board/BoardPage';
import { BacklogPage } from '@/features/backlog/BacklogPage';
import { TimelinePage } from '@/features/timeline/TimelinePage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { ListPage } from '@/features/list/ListPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'w/:workspaceId',
        element: <DashboardPage />,
      },
      {
        path: 'p/:projectId/board',
        element: <BoardPage />,
      },
      {
        path: 'p/:projectId/backlog',
        element: <BacklogPage />,
      },
      {
        path: 'p/:projectId/timeline',
        element: <TimelinePage />,
      },
      {
        path: 'p/:projectId/calendar',
        element: <CalendarPage />,
      },
      {
        path: 'p/:projectId/list',
        element: <ListPage />,
      },
      {
        path: 'projects/:projectId/board',
        element: <BoardPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
