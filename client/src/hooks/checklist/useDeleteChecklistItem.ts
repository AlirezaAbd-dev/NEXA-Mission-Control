import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checklistApi } from "@/lib/api/checklist.api";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useDeleteChecklistItem = (cardId: string, projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => checklistApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.cards.detail(cardId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.enterprise.project(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.checklists.byCard(cardId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.cards.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.activities.byCard(cardId),
      });
    },
  });
};
