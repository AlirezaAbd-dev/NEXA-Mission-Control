import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistApi } from '@/lib/api/checklist.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useUpdateChecklistItem = (cardId: string, projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      itemId: string;
      title?: string;
      is_done?: boolean;
      assignee_id?: string | null;
      due_date?: string | null;
    }) => checklistApi.updateItem(data.itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checklists.byCard(cardId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.byProject(projectId) });
    },
  });
};
