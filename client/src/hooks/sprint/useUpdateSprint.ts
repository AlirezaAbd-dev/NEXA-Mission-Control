import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintApi } from '@/lib/api/sprint.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useUpdateSprint = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      name?: string;
      goal?: string;
      start_date?: string;
      end_date?: string;
      status?: string;
    }) => sprintApi.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sprints.byProject(projectId) });
    },
  });
};
