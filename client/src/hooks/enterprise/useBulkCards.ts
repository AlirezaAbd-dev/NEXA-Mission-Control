import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { apiClient } from "@/lib/api/client";
export function useBulkCards(projectId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      card_ids: string[];
      action: "move" | "priority" | "archive" | "assign" | "restore";
      value?: string;
    }) =>
      (await apiClient.post(`/enterprise/projects/${projectId}/bulk`, data))
        .data,
    onSuccess: () => {
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.cards.byProject(projectId),
      });
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.enterprise.project(projectId),
      });
    },
  });
}
