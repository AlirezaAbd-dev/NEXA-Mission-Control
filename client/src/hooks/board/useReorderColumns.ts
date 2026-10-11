import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boardApi } from '@/lib/api/board.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useReorderColumns = (projectId: string, boardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnIds: string[]) => boardApi.reorderColumns(boardId, columnIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.boards.byProject(projectId) });
    },
  });
};
