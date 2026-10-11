import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/lib/api/project.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCreateProject = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      identifier: string;
      description?: string;
      color?: string;
      cover_url?: string;
      visibility?: string;
    }) => projectApi.create({ ...data, workspace_id: workspaceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.byWorkspace(workspaceId) });
    },
  });
};
