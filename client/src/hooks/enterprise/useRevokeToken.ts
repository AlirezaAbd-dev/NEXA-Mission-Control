import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useRevokeToken() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.delete(`/integrations/tokens/${id}`)).data,
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: QUERY_KEYS.auth.tokens }),
  });
}
