import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { apiClient } from "@/lib/api/client";
import type { BoardPreferences } from "@/types/enterprise";
export function usePreferences(projectId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.enterprise.resource(projectId, "preferences"),
    queryFn: async () =>
      (
        await apiClient.get<BoardPreferences>(
          `/enterprise/projects/${projectId}/preferences`,
        )
      ).data,
    enabled: !!projectId,
  });
}
