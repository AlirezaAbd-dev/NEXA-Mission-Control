import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistApi } from '@/lib/api/checklist.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCreateChecklist = (cardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) => checklistApi.createChecklist(cardId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checklists.byCard(cardId) });
    },
  });
};
