import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintApi } from '@/lib/api/sprint.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useToggleSprintCard = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { sprintId: string; cardId: string; add: boolean }) =>
      sprintApi.toggleCard(data.sprintId, data.cardId, data.add),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sprints.byProject(projectId) });
    },
  });
};
