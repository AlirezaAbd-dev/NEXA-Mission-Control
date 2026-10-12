import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { CardMetadata } from "@/types/enterprise";
export function useCardMetadata(projectId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: CardMetadata) =>
      (
        await apiClient.put(
          `/enterprise/projects/${projectId}/cards/${id}/metadata`,
          data,
        )
      ).data,
    onSuccess: () =>
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.enterprise.project(projectId),
      }),
  });
}
