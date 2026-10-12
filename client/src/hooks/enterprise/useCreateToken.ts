import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export function useCreateToken() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; days: number }) =>
      (await apiClient.post<{ token: string }>("/integrations/tokens", data))
        .data,
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: QUERY_KEYS.auth.tokens }),
  });
}
