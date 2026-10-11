import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cardApi } from '@/lib/api/card.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useSetCardLabels = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { cardId: string; labelIds: string[] }) =>
      cardApi.setLabels(data.cardId, data.labelIds),
    onSuccess: (card) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.byProject(projectId) });
      queryClient.setQueryData(QUERY_KEYS.cards.detail(card.id), card);
    },
  });
};
