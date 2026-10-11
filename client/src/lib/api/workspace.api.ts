import { apiClient } from './client';
import type { Workspace, WorkspaceMember } from '@/types';

export const workspaceApi = {
  list: async (): Promise<Workspace[]> => {
    const res = await apiClient.get<Workspace[]>('/workspaces');
    return res.data;
  },

  getById: async (id: string): Promise<Workspace> => {
    const res = await apiClient.get<Workspace>(`/workspaces/${id}`);
    return res.data;
  },

  create: async (data: { name: string; description?: string; logo_url?: string }): Promise<Workspace> => {
    const res = await apiClient.post<Workspace>('/workspaces', data);
    return res.data;
  },

  update: async (id: string, data: { name?: string; description?: string; logo_url?: string }): Promise<Workspace> => {
    const res = await apiClient.put<Workspace>(`/workspaces/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${id}`);
  },

  listMembers: async (workspaceId: string): Promise<WorkspaceMember[]> => {
    const res = await apiClient.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
    return res.data;
  },

  addMember: async (workspaceId: string, data: { email: string; role: string }): Promise<void> => {
    await apiClient.post(`/workspaces/${workspaceId}/members`, data);
  },

  removeMember: async (workspaceId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },
};
