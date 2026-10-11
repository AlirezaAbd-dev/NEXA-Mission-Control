import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cardApi } from '@/lib/api/card.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useToggleVoteCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => cardApi.toggleVote(cardId),
    onSuccess: (updatedCard, cardId) => {
      queryClient.setQueryData(QUERY_KEYS.cards.detail(cardId), updatedCard);
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
};
