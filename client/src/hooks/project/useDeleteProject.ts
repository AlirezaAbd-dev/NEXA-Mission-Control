import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "@/lib/api/project.api";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useDeleteProject = (workspaceId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectApi.delete(projectId),
    onSuccess: (_data, projectId) => {
      queryClient.removeQueries({ queryKey: QUERY_KEYS.projects.detail(projectId) });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.boards.byProject(projectId) });
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.projects.byWorkspace(workspaceId),
        });
      }
    },
  });
};
