import { useMutation, useQueryClient } from "@tanstack/react-query";
import { commentApi } from "@/lib/api/comment.api";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useUpdateComment = (cardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      commentApi.update(commentId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.comments.byCard(cardId),
      });
    },
  });
};
