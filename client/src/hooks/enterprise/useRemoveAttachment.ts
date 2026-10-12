import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useRemoveAttachment(projectId: string, cardId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete(
          `/enterprise/projects/${projectId}/cards/${cardId}/attachments/${id}`,
        )
      ).data,
    onSuccess: () => {
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.cards.attachments(cardId),
      });
      cache.invalidateQueries({ queryKey: QUERY_KEYS.cards.detail(cardId) });
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.cards.byProject(projectId),
      });
    },
  });
}
