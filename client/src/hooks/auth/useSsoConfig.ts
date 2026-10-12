import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useSsoConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.auth.oidc,
    queryFn: async () =>
      (await apiClient.get<{ enabled: boolean }>("/integrations/oidc/config"))
        .data,
  });
}
