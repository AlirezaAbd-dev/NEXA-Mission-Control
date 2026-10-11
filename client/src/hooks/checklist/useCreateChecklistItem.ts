import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistApi } from '@/lib/api/checklist.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCreateChecklistItem = (cardId: string, projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { checklistId: string; title: string; assignee_id?: string; due_date?: string }) =>
      checklistApi.createItem(data.checklistId, {
        title: data.title,
        assignee_id: data.assignee_id,
        due_date: data.due_date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checklists.byCard(cardId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.byProject(projectId) });
    },
  });
};
