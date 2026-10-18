import { useEffect } from "react";
import { useParams } from "react-router";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { useProject } from "@/hooks/project/useProject";
import { useWorkspaces } from "./useWorkspaces";
import { useWorkspaceSelectionStore } from "@/stores/workspace.store";
import { resolveWorkspaceId } from "@/lib/workspaceSelection";
export function useActiveWorkspace() {
  const { workspaceId, projectId } = useParams<{ workspaceId?: string; projectId?: string }>();
  const { data: user } = useCurrentUser();
  const userId = user?.id;
  const { data: workspaces = [] } = useWorkspaces();
  const { data: project } = useProject(projectId);
  const savedId = useWorkspaceSelectionStore(state => user ? state.selectedByUser[user.id] : undefined);
  const select = useWorkspaceSelectionStore(state => state.select);
  const currentWorkspaceId = resolveWorkspaceId(workspaces, workspaceId || project?.workspace_id, savedId);
  useEffect(() => { if (userId && currentWorkspaceId) select(userId, currentWorkspaceId); }, [userId, currentWorkspaceId, select]);
  return { workspaces, currentWorkspaceId, currentWorkspace: workspaces.find(workspace => workspace.id === currentWorkspaceId), selectWorkspace: (id: string) => { if (user) select(user.id, id); } };
}
