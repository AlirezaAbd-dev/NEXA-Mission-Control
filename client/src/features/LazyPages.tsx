import { lazy } from "react";
export const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
export const RegisterPage = lazy(() =>
  import("@/features/auth/RegisterPage").then((m) => ({
    default: m.RegisterPage,
  })),
);
export const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({
    default: m.DashboardPage,
  })),
);
export const BoardPage = lazy(() =>
  import("@/features/board/BoardPage").then((m) => ({ default: m.BoardPage })),
);
export const BacklogPage = lazy(() =>
  import("@/features/backlog/BacklogPage").then((m) => ({
    default: m.BacklogPage,
  })),
);
export const TimelinePage = lazy(() =>
  import("@/features/timeline/TimelinePage").then((m) => ({
    default: m.TimelinePage,
  })),
);
export const CalendarPage = lazy(() =>
  import("@/features/calendar/CalendarPage").then((m) => ({
    default: m.CalendarPage,
  })),
);
export const ListPage = lazy(() =>
  import("@/features/list/ListPage").then((m) => ({ default: m.ListPage })),
);
export const AutomationPage = lazy(() =>
  import("@/features/enterprise/AutomationPage").then((m) => ({
    default: m.AutomationPage,
  })),
);
export const InsightsPage = lazy(() =>
  import("@/features/enterprise/InsightsPage").then((m) => ({
    default: m.InsightsPage,
  })),
);
export const GovernancePage = lazy(() =>
  import("@/features/enterprise/GovernancePage").then((m) => ({
    default: m.GovernancePage,
  })),
);
export const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);

export const WorkspaceWorkPage = lazy(() =>
  import("@/features/productivity/WorkspaceWorkPage").then((m) => ({
    default: m.WorkspaceWorkPage,
  })),
);

export const IntakePage = lazy(() =>
  import("@/features/productivity/IntakePage").then((m) => ({
    default: m.IntakePage,
  })),
);

export const ServiceDeskPage = lazy(() =>
  import("@/features/localops/ServiceDeskPage").then((m) => ({
    default: m.ServiceDeskPage,
  })),
);
