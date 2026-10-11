import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth.api';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { useAuthStore } from '@/stores/auth.store';

export const useCurrentUser = () => {
  const setUser = useAuthStore((s) => s.setUser);
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: QUERY_KEYS.auth.me,
    queryFn: async () => {
      const user = await authApi.getMe();
      setUser(user);
      return user;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
};
