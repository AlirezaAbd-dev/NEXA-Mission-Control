import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardApi } from '@/lib/api/card.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCardLinks = (cardId?: string | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.cards.links(cardId || ''),
    queryFn: () => cardApi.listLinks(cardId!),
    enabled: !!cardId,
  });
};

export const useAddCardLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, targetCardId, linkType }: { cardId: string; targetCardId: string; linkType: string }) =>
      cardApi.addLink(cardId, targetCardId, linkType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.links(variables.cardId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.links(variables.targetCardId) });
    },
  });
};

export const useRemoveCardLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, linkId }: { cardId: string; linkId: string }) =>
      cardApi.removeLink(cardId, linkId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.links(variables.cardId) });
    },
  });
};
