import { create } from "zustand";
import { parseWorkspaceSelections } from "@/lib/workspaceSelection";
const key = "mission_control_workspace_selections";
function loadSelections() { try { return parseWorkspaceSelections(localStorage.getItem(key)); } catch { return {}; } }
interface WorkspaceSelectionStore {
  selectedByUser: Record<string, string>;
  select: (userId: string, workspaceId: string) => void;
}
export const useWorkspaceSelectionStore = create<WorkspaceSelectionStore>((set) => ({
  selectedByUser: loadSelections(),
  select: (userId, workspaceId) => set(current => {
    if (!userId || !workspaceId || current.selectedByUser[userId] === workspaceId) return current;
    const selectedByUser = { ...current.selectedByUser, [userId]: workspaceId };
    try { localStorage.setItem(key, JSON.stringify(selectedByUser)); } catch {/* Selection still works when browser storage is unavailable. */ }
    return { selectedByUser };
  }),
}));
