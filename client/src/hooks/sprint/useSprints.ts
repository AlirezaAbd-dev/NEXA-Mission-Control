import { useQuery } from '@tanstack/react-query';
import { sprintApi } from '@/lib/api/sprint.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useSprints = (projectId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.sprints.byProject(projectId || ''),
    queryFn: () => sprintApi.listByProject(projectId!),
    enabled: !!projectId,
  });
};
