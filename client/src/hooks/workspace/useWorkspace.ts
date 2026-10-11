import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '@/lib/api/workspace.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useWorkspace = (workspaceId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.workspaces.detail(workspaceId || ''),
    queryFn: () => workspaceApi.getById(workspaceId!),
    enabled: !!workspaceId,
  });
};
