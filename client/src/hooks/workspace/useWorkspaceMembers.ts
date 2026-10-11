import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '@/lib/api/workspace.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useWorkspaceMembers = (workspaceId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.workspaces.members(workspaceId || ''),
    queryFn: () => workspaceApi.listMembers(workspaceId!),
    enabled: !!workspaceId,
  });
};
