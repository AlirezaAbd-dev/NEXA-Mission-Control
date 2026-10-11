import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boardApi } from '@/lib/api/board.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useDeleteColumn = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnId: string) => boardApi.deleteColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.boards.byProject(projectId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.byProject(projectId) });
    },
  });
};
