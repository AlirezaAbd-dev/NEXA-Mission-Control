import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api/project.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useProjects = (workspaceId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.projects.byWorkspace(workspaceId || ''),
    queryFn: () => projectApi.listByWorkspace(workspaceId!),
    enabled: !!workspaceId,
  });
};
