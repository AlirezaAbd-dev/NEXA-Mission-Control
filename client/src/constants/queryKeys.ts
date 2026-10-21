export const QUERY_KEYS = {
  productivity: {
    all: ["productivity"] as const,
    resource: (path: string) => ["productivity", path] as const,
  },
  enterprise: {
    project: (id: string) => ["enterprise", id] as const,
    links: (id: string) => ["enterprise", id, "links"] as const,
    resource: (id: string, resource: string) =>
      ["enterprise", id, resource] as const,
  },
  auth: {
    mfa: ["auth", "mfa"] as const,
    tokens: ["auth", "tokens"] as const,
    oidc: ["auth", "oidc"] as const,
    me: ["auth", "me"] as const,
  },
  workspaces: {
    metrics: (id: string) => ["workspaces", id, "metrics"] as const,
    all: ["workspaces"] as const,
    detail: (id: string) => ["workspaces", id] as const,
    members: (id: string) => ["workspaces", id, "members"] as const,
  },
  projects: {
    byWorkspace: (workspaceId: string) =>
      ["projects", "workspace", workspaceId] as const,
    detail: (id: string) => ["projects", id] as const,
  },
  boards: {
    byProject: (projectId: string) => ["boards", "project", projectId] as const,
    detail: (id: string) => ["boards", id] as const,
  },
  cards: {
    byProject: (projectId: string) => ["cards", "project", projectId] as const,
    byBoard: (boardId: string) => ["cards", "board", boardId] as const,
    detail: (id: string) => ["cards", id] as const,
    attachments: (id: string) => ["cards", id, "attachments"] as const,
    watchers: (id: string) => ["cards", id, "watchers"] as const,
    links: (id: string) => ["cards", id, "links"] as const,
  },
  comments: {
    byCard: (cardId: string) => ["comments", "card", cardId] as const,
  },
  checklists: {
    byCard: (cardId: string) => ["checklists", "card", cardId] as const,
  },
  labels: {
    byWorkspace: (workspaceId: string) =>
      ["labels", "workspace", workspaceId] as const,
  },
  sprints: {
    byProject: (projectId: string) =>
      ["sprints", "project", projectId] as const,
  },
  timeLogs: {
    byCard: (cardId: string) => ["timeLogs", "card", cardId] as const,
    activeTimer: (cardId: string) =>
      ["timeLogs", "activeTimer", cardId] as const,
  },
  customFields: {
    definitions: (projectId: string) =>
      ["customFields", "definitions", projectId] as const,
    values: (cardId: string) => ["customFields", "values", cardId] as const,
  },
  activities: {
    byWorkspace: (workspaceId: string) =>
      ["activities", "workspace", workspaceId] as const,
    byCard: (cardId: string) => ["activities", "card", cardId] as const,
  },

  notifications: {
    all: ["notifications"] as const,
  },
  search: {
    all: ["search"] as const,
    query: (q: string) => ["search", q] as const,
  },
  localops: {
    resource: (project: string, path: string) =>
      ["localops", project, path] as const,
  },
} as const;
