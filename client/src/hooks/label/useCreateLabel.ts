import { useMutation, useQueryClient } from '@tanstack/react-query';
import { labelApi } from '@/lib/api/label.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCreateLabel = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      labelApi.create({ ...data, workspace_id: workspaceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.labels.byWorkspace(workspaceId) });
    },
  });
};
