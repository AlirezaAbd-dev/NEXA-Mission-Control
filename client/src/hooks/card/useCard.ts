import { useQuery } from '@tanstack/react-query';
import { cardApi } from '@/lib/api/card.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCard = (cardId?: string | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.cards.detail(cardId || ''),
    queryFn: () => cardApi.getById(cardId!),
    enabled: !!cardId,
  });
};
