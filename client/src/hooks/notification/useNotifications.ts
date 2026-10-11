import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '@/lib/api/notification.api';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { useAuthStore } from '@/stores/auth.store';

export const useNotifications = () => {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: QUERY_KEYS.notifications.all,
    queryFn: () => notificationApi.list(),
    enabled: !!token,
    refetchInterval: 30_000,
  });
};
