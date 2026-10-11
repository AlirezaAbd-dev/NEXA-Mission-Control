export const QUERY_KEYS = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  workspaces: {
    all: ['workspaces'] as const,
    detail: (id: string) => ['workspaces', id] as const,
    members: (id: string) => ['workspaces', id, 'members'] as const,
  },
  projects: {
    byWorkspace: (workspaceId: string) => ['projects', 'workspace', workspaceId] as const,
    detail: (id: string) => ['projects', id] as const,
  },
  boards: {
    byProject: (projectId: string) => ['boards', 'project', projectId] as const,
    detail: (id: string) => ['boards', id] as const,
  },
  cards: {
    byProject: (projectId: string) => ['cards', 'project', projectId] as const,
    byBoard: (boardId: string) => ['cards', 'board', boardId] as const,
    detail: (id: string) => ['cards', id] as const,
  },
  comments: {
    byCard: (cardId: string) => ['comments', 'card', cardId] as const,
  },
  checklists: {
    byCard: (cardId: string) => ['checklists', 'card', cardId] as const,
  },
  labels: {
    byWorkspace: (workspaceId: string) => ['labels', 'workspace', workspaceId] as const,
  },
  sprints: {
    byProject: (projectId: string) => ['sprints', 'project', projectId] as const,
  },
  timeLogs: {
    byCard: (cardId: string) => ['timeLogs', 'card', cardId] as const,
  },
  activities: {
    byWorkspace: (workspaceId: string) => ['activities', 'workspace', workspaceId] as const,
    byCard: (cardId: string) => ['activities', 'card', cardId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
  },
  search: {
    query: (q: string) => ['search', q] as const,
  },
} as const;
