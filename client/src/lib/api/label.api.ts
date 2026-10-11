import { apiClient } from './client';
import type { Label } from '@/types';

export const labelApi = {
  listByWorkspace: async (workspaceId: string): Promise<Label[]> => {
    const res = await apiClient.get<Label[]>('/labels', { params: { workspace_id: workspaceId } });
    return res.data;
  },

  create: async (data: { workspace_id: string; name: string; color: string }): Promise<Label> => {
    const res = await apiClient.post<Label>('/labels', data);
    return res.data;
  },

  update: async (id: string, data: { name?: string; color?: string }): Promise<Label> => {
    const res = await apiClient.put<Label>(`/labels/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/labels/${id}`);
  },
};
