import { useQuery } from '@tanstack/react-query';
import { commentApi } from '@/lib/api/comment.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useComments = (cardId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.comments.byCard(cardId || ''),
    queryFn: () => commentApi.listByCard(cardId!),
    enabled: !!cardId,
  });
};
