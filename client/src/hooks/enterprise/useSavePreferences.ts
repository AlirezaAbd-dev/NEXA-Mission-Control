import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { apiClient } from "@/lib/api/client";
import type { BoardPreferences } from "@/types/enterprise";
export function useSavePreferences(projectId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (data: BoardPreferences) =>
      (
        await apiClient.put<BoardPreferences>(
          `/enterprise/projects/${projectId}/preferences`,
          data,
        )
      ).data,
    onSuccess: (data) => {
      cache.setQueryData(
        QUERY_KEYS.enterprise.resource(projectId, "preferences"),
        data,
      );
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.enterprise.resource(projectId, "starred"),
      });
    },
  });
}
