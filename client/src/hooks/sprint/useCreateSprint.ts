import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintApi } from '@/lib/api/sprint.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCreateSprint = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; goal?: string; start_date?: string; end_date?: string }) =>
      sprintApi.create({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sprints.byProject(projectId) });
    },
  });
};
