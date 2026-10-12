import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useLocalResource<T>(
  project: string,
  path: string,
  enabled = true,
) {
  return useQuery({
    queryKey: QUERY_KEYS.localops.resource(project, path),
    queryFn: async () =>
      (await apiClient.get<T>("/localops/projects/" + project + "/" + path))
        .data,
    refetchInterval: path === "tickets" ? 30000 : false,
    enabled: !!project && enabled,
  });
}
