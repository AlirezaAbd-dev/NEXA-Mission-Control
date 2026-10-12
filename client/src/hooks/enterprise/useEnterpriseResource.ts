import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { EnterpriseResource } from "@/types/enterprise";
export function useEnterpriseResource<T = EnterpriseResource[]>(
  projectId: string,
  resource: string,
) {
  return useQuery({
    queryKey: QUERY_KEYS.enterprise.resource(projectId, resource),
    queryFn: async () =>
      (await apiClient.get<T>(`/enterprise/projects/${projectId}/${resource}`))
        .data,
    enabled: !!projectId,
  });
}
