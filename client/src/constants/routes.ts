export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  WORKSPACE: (id: string) => `/w/${id}`,
  PROJECT_BOARD: (id: string) => `/p/${id}/board`,
  PROJECT_BACKLOG: (id: string) => `/p/${id}/backlog`,
  PROJECT_TIMELINE: (id: string) => `/p/${id}/timeline`,
  PROJECT_CALENDAR: (id: string) => `/p/${id}/calendar`,
  PROJECT_LIST: (id: string) => `/p/${id}/list`,
  SETTINGS: '/settings',
} as const;
