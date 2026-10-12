import { useMutation, useQueryClient } from "@tanstack/react-query";
import { commentApi } from "@/lib/api/comment.api";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useCreateComment = (cardId: string, projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: string | { body: string; is_internal: boolean }) =>
      typeof data === "string"
        ? commentApi.create(cardId, data)
        : commentApi.create(cardId, data.body, data.is_internal),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.comments.byCard(cardId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.cards.byProject(projectId),
      });
    },
  });
};
