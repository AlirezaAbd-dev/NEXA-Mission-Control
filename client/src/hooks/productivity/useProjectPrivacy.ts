import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "@/lib/api/project.api";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useProjectPrivacy(projectId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (visibility: "public" | "private") =>
      projectApi.update(projectId, { visibility }),
    onSuccess: (project) => {
      cache.setQueryData(QUERY_KEYS.projects.detail(projectId), project);
      void cache.invalidateQueries({
        queryKey: QUERY_KEYS.projects.byWorkspace(project.workspace_id),
      });
    },
  });
}
