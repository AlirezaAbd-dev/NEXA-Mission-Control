import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cardApi } from '@/lib/api/card.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCreateCard = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      column_id: string;
      title: string;
      description?: string;
      priority?: string;
      position?: number;
      due_date?: string;
      start_date?: string;
      estimated_hours?: number;
      assignee_ids?: string[];
      label_ids?: string[];
    }) => cardApi.create({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards.byProject(projectId) });
    },
  });
};
