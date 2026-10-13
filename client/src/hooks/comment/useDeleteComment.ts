import { useMutation, useQueryClient } from "@tanstack/react-query";
import { commentApi } from "@/lib/api/comment.api";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useDeleteComment = (cardId: string, projectId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentApi.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.comments.byCard(cardId),
      });
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.cards.byProject(projectId),
        });
      }
    },
  });
};
