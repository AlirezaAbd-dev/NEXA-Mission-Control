import { useMutation, useQueryClient } from '@tanstack/react-query';
import { labelApi } from '@/lib/api/label.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useUpdateLabel = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; name?: string; color?: string }) =>
      labelApi.update(data.id, { name: data.name, color: data.color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.labels.byWorkspace(workspaceId) });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
};
