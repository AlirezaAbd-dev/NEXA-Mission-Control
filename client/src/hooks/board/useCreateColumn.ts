import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boardApi } from '@/lib/api/board.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCreateColumn = (projectId: string, boardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; type_?: string; position?: number; wip_limit?: number }) =>
      boardApi.createColumn(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.boards.byProject(projectId) });
    },
  });
};
