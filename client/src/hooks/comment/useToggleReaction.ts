import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi } from '@/lib/api/comment.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useToggleReaction = (cardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { commentId: string; emoji: string }) =>
      commentApi.toggleReaction(data.commentId, data.emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments.byCard(cardId) });
    },
  });
};
