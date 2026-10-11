import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cardApi } from '@/lib/api/card.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useMoveCard = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; column_id: string; position: number }) =>
      cardApi.move(data.id, data.column_id, data.position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.byProject(projectId) });
    },
  });
};
