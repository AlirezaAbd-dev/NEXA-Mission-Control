import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ProductivityInput } from "@/types/productivity";
export function useProductivityMutation() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async ({
      path,
      method = "post",
      data,
    }: {
      path: string;
      method?: "post" | "put" | "delete";
      data?: ProductivityInput;
    }) =>
      (
        await apiClient.request<{ id?: string; token?: string }>({
          url: `/productivity/${path}`,
          method,
          data,
        })
      ).data,
    onSuccess: () => cache.invalidateQueries({ refetchType: "active" }),
  });
}
