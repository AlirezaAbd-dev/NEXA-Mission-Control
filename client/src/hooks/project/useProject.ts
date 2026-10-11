import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api/project.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useProject = (projectId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.projects.detail(projectId || ''),
    queryFn: () => projectApi.getById(projectId!),
    enabled: !!projectId,
  });
};
