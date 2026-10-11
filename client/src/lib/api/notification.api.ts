import { apiClient } from './client';
import type { Notification } from '@/types';

export const notificationApi = {
  list: async (): Promise<Notification[]> => {
    const res = await apiClient.get<Notification[]>('/notifications');
    return res.data;
  },

  markRead: async (id: string): Promise<void> => {
    await apiClient.post(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read-all');
  },
};
