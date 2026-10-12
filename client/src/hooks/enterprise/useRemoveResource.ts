import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useRemoveResource(projectId: string, resource: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete(
          `/enterprise/projects/${projectId}/${resource}/${id}`,
        )
      ).data,
    onSuccess: () =>
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.enterprise.project(projectId),
      }),
  });
}
