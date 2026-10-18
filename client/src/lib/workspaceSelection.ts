export function resolveWorkspaceId(workspaces: { id: string }[], routedId?: string, savedId?: string): string {
  if (routedId && workspaces.some(workspace => workspace.id === routedId)) return routedId;
  if (savedId && workspaces.some(workspace => workspace.id === savedId)) return savedId;
  return workspaces[0]?.id || "";
}
export function parseWorkspaceSelections(value: string | null): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, value]) => key && typeof value === "string" && value));
  } catch { return {}; }
}
