import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, type RegisterDTO } from "@/lib/api/auth.api";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useRegister = () => {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (data: RegisterDTO) => authApi.register(data),
    onSuccess: (data) => {
      queryClient.clear();
      setAuth(data.user, data.token);
      queryClient.setQueryData(QUERY_KEYS.auth.me, data.user);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workspaces.all });
    },
  });
};
