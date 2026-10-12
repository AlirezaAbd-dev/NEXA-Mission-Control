import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { PersonalToken } from "@/types/enterprise";
export function usePersonalTokens() {
  return useQuery({
    queryKey: QUERY_KEYS.auth.tokens,
    queryFn: async () =>
      (await apiClient.get<PersonalToken[]>("/integrations/tokens")).data,
  });
}
