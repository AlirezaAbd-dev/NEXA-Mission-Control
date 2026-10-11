import { apiClient } from './client';
import type { TimeLog, ActiveTimer } from '@/types';

export const timeLogApi = {
  list: async (cardId: string): Promise<TimeLog[]> => {
    const res = await apiClient.get<TimeLog[]>('/time-logs', { params: { card_id: cardId } });
    return res.data;
  },

  create: async (data: { card_id: string; minutes: number; description?: string }): Promise<TimeLog> => {
    const res = await apiClient.post<TimeLog>('/time-logs', data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/time-logs/${id}`);
  },

  getActiveTimer: async (cardId: string): Promise<ActiveTimer | null> => {
    const res = await apiClient.get<ActiveTimer | null>('/time-logs/timer/active', { params: { card_id: cardId } });
    return res.data;
  },

  startTimer: async (cardId: string, description?: string): Promise<ActiveTimer> => {
    const res = await apiClient.post<ActiveTimer>('/time-logs/timer/start', { card_id: cardId, description });
    return res.data;
  },

  stopTimer: async (cardId: string, description?: string): Promise<TimeLog | null> => {
    const res = await apiClient.post<TimeLog | null>('/time-logs/timer/stop', { card_id: cardId, description });
    return res.data;
  },
};
