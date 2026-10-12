import {
  ServiceDeskPage,
  IntakePage,
  WorkspaceWorkPage,
  LoginPage,
  RegisterPage,
  DashboardPage,
  BoardPage,
  BacklogPage,
  TimelinePage,
  CalendarPage,
  ListPage,
  AutomationPage,
  InsightsPage,
  GovernancePage,
  SettingsPage,
} from "@/features/LazyPages";
import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { SsoCallback } from "@/features/auth/SsoCallback";

export const router = createBrowserRouter([
  { path: "/intake/:token", element: <IntakePage /> },
  {
    path: "/login",
    element: <LoginPage />,
  },
  { path: "/sso/callback", element: <SsoCallback /> },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "w/:workspaceId/work", element: <WorkspaceWorkPage /> },
      { path: "p/:projectId/service-desk", element: <ServiceDeskPage /> },
      { path: "p/:projectId/automation", element: <AutomationPage /> },
      { path: "p/:projectId/insights", element: <InsightsPage /> },
      { path: "p/:projectId/governance", element: <GovernancePage /> },
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "w/:workspaceId",
        element: <DashboardPage />,
      },
      {
        path: "p/:projectId/board",
        element: <BoardPage />,
      },
      {
        path: "p/:projectId/backlog",
        element: <BacklogPage />,
      },
      {
        path: "p/:projectId/timeline",
        element: <TimelinePage />,
      },
      {
        path: "p/:projectId/calendar",
        element: <CalendarPage />,
      },
      {
        path: "p/:projectId/list",
        element: <ListPage />,
      },
      {
        path: "projects/:projectId/board",
        element: <BoardPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
