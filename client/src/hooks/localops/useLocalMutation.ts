import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
export function useLocalMutation(project: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async ({
      path,
      data,
      method = "post",
    }: {
      path: string;
      data?: Record<string, unknown>;
      method?: "post" | "delete";
    }) =>
      (
        await apiClient.request<{ id?: string; success?: boolean }>({
          url: "/localops/projects/" + project + "/" + path,
          method,
          data,
        })
      ).data,
    onSuccess: () => cache.invalidateQueries({ refetchType: "active" }),
  });
}
