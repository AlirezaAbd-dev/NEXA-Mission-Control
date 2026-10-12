import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useImportBoard(projectId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      format: "trello" | "mission-control";
      data: unknown;
    }) =>
      (
        await apiClient.post<{ imported: number }>(
          `/enterprise/projects/${projectId}/import`,
          data,
        )
      ).data,
    onSuccess: () => {
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.cards.byProject(projectId),
      });
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.boards.byProject(projectId),
      });
    },
  });
}
