import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useMfa() {
  return useQuery({
    queryKey: QUERY_KEYS.auth.mfa,
    queryFn: async () =>
      (await apiClient.get<{ enabled: boolean }>("/auth/mfa")).data,
  });
}
