import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useWorkspaceMetrics(workspaceId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.workspaces.metrics(workspaceId),
    queryFn: async () =>
      (
        await apiClient.get<{
          projects: number;
          tasks: number;
          pending: number;
          urgent: number;
          overdue: number;
        }>(`/enterprise/workspaces/${workspaceId}/metrics`)
      ).data,
    enabled: !!workspaceId,
  });
}
