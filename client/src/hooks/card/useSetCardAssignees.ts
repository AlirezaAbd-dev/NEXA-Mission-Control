import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cardApi } from '@/lib/api/card.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useSetCardAssignees = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { cardId: string; userIds: string[] }) =>
      cardApi.setAssignees(data.cardId, data.userIds),
    onSuccess: (card) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.byProject(projectId) });
      queryClient.setQueryData(QUERY_KEYS.cards.detail(card.id), card);
    },
  });
};
