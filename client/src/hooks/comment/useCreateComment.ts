import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi } from '@/lib/api/comment.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCreateComment = (cardId: string, projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => commentApi.create(cardId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments.byCard(cardId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.byProject(projectId) });
    },
  });
};
