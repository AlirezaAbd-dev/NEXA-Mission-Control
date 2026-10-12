import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { apiClient } from "@/lib/api/client";
import type { CardLink } from "@/types";
export function useProjectLinks(projectId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.enterprise.links(projectId),
    queryFn: async () =>
      (
        await apiClient.get<CardLink[]>(
          `/enterprise/projects/${projectId}/links`,
        )
      ).data,
    enabled: !!projectId,
  });
}
