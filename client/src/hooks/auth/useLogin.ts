import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type LoginDTO } from '@/lib/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useLogin = () => {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (data: LoginDTO) => authApi.login(data),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      queryClient.setQueryData(QUERY_KEYS.auth.me, data.user);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workspaces.all });
    },
  });
};
