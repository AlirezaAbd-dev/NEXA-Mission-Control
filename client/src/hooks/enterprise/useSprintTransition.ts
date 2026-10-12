import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useSprintTransition(projectId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      status: "active" | "completed";
      start_date?: string;
      end_date?: string;
      goal?: string;
      carry_to?: string;
    }) =>
      (
        await apiClient.post(
          `/enterprise/projects/${projectId}/sprints/${id}/transition`,
          data,
        )
      ).data,
    onSuccess: () => {
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.sprints.byProject(projectId),
      });
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.enterprise.project(projectId),
      });
    },
  });
}
