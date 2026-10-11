import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '@/lib/api/notification.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.all });
    },
  });
};
