import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "@/lib/api/project.api";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useUpdateProject = (projectId: string, workspaceId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name?: string;
      description?: string;
      color?: string;
      cover_url?: string;
      visibility?: string;
    }) => projectApi.update(projectId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.projects.detail(projectId), updated);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.boards.byProject(projectId) });
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.projects.byWorkspace(workspaceId),
        });
      }
    },
  });
};
