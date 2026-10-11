import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '@/lib/api/notification.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.all });
    },
  });
};
