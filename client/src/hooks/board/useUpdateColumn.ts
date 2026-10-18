import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boardApi } from '@/lib/api/board.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useUpdateColumn = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { columnId: string; name?: string; type_?: string; position?: number; wip_limit?: number }) =>
      boardApi.updateColumn(data.columnId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.byProject(projectId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enterprise.project(projectId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.boards.byProject(projectId) });
    },
  });
};
