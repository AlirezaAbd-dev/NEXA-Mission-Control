export const workViews = ["board", "list", "calendar", "timeline"] as const;
export type WorkView = typeof workViews[number];
export function isWorkView(value: string): value is WorkView {
  return (workViews as readonly string[]).includes(value);
}
export function projectSection(pathname: string, projectId: string): string {
  const match = pathname.match(/^\/(?:p|projects)\/([^/]+)\/([^/]+)\/?$/);
  return match?.[1] === projectId ? match[2] : "";
}
export function readWorkView(userId: string | undefined, projectId: string, storage?: Pick<Storage, "getItem">): WorkView {
  if (!userId) return "board";
  try {
    const saved = (storage ?? localStorage).getItem(`mission_control_view:${userId}:${projectId}`);
    return saved && isWorkView(saved) ? saved : "board";
  } catch { return "board"; }
}
export function saveWorkView(userId: string | undefined, projectId: string, view: string, storage?: Pick<Storage, "setItem">) {
  if (!userId || !isWorkView(view)) return;
  try { (storage ?? localStorage).setItem(`mission_control_view:${userId}:${projectId}`, view); } catch { /* Navigation also works without persistent storage. */ }
}
export function readRecentProjects(userId: string | undefined, workspaceId: string | undefined, storage?: Pick<Storage, "getItem">): string[] {
  if (!userId || !workspaceId) return [];
  try {
    const value = JSON.parse((storage ?? localStorage).getItem(`mission_control_recent:${userId}:${workspaceId}`) || "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 100))].slice(0, 6) : [];
  } catch { return []; }
}
export function rememberProject(userId: string | undefined, workspaceId: string | undefined, projectId: string, storage?: Pick<Storage, "getItem" | "setItem">) {
  if (!userId || !workspaceId || !projectId) return;
  try {
    const recent = [projectId, ...readRecentProjects(userId, workspaceId, storage).filter(id => id !== projectId)].slice(0, 6);
    (storage ?? localStorage).setItem(`mission_control_recent:${userId}:${workspaceId}`, JSON.stringify(recent));
  } catch { /* Recent projects are optional when storage is unavailable. */ }
}
