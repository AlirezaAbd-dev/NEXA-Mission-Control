import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardApi } from '@/lib/api/card.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCardWatchers = (cardId?: string | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.cards.watchers(cardId || ''),
    queryFn: () => cardApi.listWatchers(cardId!),
    enabled: !!cardId,
  });
};

export const useToggleWatchCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => cardApi.toggleWatch(cardId),
    onSuccess: (updatedCard, cardId) => {
      queryClient.setQueryData(QUERY_KEYS.cards.detail(cardId), updatedCard);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.watchers(cardId) });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
};
