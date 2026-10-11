import { useQuery } from '@tanstack/react-query';
import { boardApi } from '@/lib/api/board.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useBoard = (projectId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.boards.byProject(projectId || ''),
    queryFn: () => boardApi.getByProject(projectId!),
    enabled: !!projectId,
  });
};
