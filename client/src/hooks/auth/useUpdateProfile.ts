import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth.api";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useAuthStore } from "@/stores/auth.store";
export function useUpdateProfile() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (data: { display_name: string; avatar_url: string }) => authApi.updateMe(data),
    onSuccess: user => {
      useAuthStore.getState().setUser(user);
      cache.setQueryData(QUERY_KEYS.auth.me, user);
      void cache.invalidateQueries({ predicate: query => ["workspaces", "productivity", "cards", "comments", "activities", "search"].includes(String(query.queryKey[0])) });
    },
  });
}
