import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardApi } from "@/lib/api/card.api";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useDeleteCard = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cardApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.detail(id) });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.enterprise.project(projectId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productivity.all });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.cards.byProject(projectId),
      });
    },
  });
};
