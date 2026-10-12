import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useRunMacro(projectId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, card_id }: { id: string; card_id?: string }) =>
      (
        await apiClient.post(
          `/enterprise/projects/${projectId}/rules/${id}/run`,
          { card_id },
        )
      ).data,
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
