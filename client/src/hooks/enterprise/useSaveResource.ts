import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { ResourceInput } from "@/types/enterprise";
export function useSaveResource(projectId: string, resource: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: ResourceInput & { id?: string }) =>
      id
        ? (
            await apiClient.put(
              `/enterprise/projects/${projectId}/${resource}/${id}`,
              data,
            )
          ).data
        : (
            await apiClient.post(
              `/enterprise/projects/${projectId}/${resource}`,
              data,
            )
          ).data,
    onSuccess: () =>
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.enterprise.project(projectId),
      }),
  });
}
