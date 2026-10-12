import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useProductivity<T>(path: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.productivity.resource(path),
    queryFn: async () => (await apiClient.get<T>(`/productivity/${path}`)).data,
    enabled,
  });
}
