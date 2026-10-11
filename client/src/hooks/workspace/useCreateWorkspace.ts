import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '@/lib/api/workspace.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string; logo_url?: string }) =>
      workspaceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workspaces.all });
    },
  });
};
