import { useMutation, useQueryClient } from '@tanstack/react-query';
import { labelApi } from '@/lib/api/label.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useDeleteLabel = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => labelApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.labels.byWorkspace(workspaceId) });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
};
