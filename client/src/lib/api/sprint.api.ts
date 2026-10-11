import { apiClient } from './client';
import type { Sprint } from '@/types';

export const sprintApi = {
  listByProject: async (projectId: string): Promise<Sprint[]> => {
    const res = await apiClient.get<Sprint[]>('/sprints', { params: { project_id: projectId } });
    return res.data;
  },

  create: async (data: {
    project_id: string;
    name: string;
    goal?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Sprint> => {
    const res = await apiClient.post<Sprint>('/sprints', data);
    return res.data;
  },

  update: async (
    id: string,
    data: {
      name?: string;
      goal?: string;
      start_date?: string;
      end_date?: string;
      status?: string;
    }
  ): Promise<Sprint> => {
    const res = await apiClient.put<Sprint>(`/sprints/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/sprints/${id}`);
  },

  toggleCard: async (sprintId: string, cardId: string, add: boolean): Promise<void> => {
    await apiClient.post(`/sprints/${sprintId}/card`, { card_id: cardId, add });
  },
};
