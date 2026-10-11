import { apiClient } from './client';
import type { Project } from '@/types';

export const projectApi = {
  listByWorkspace: async (workspaceId: string): Promise<Project[]> => {
    const res = await apiClient.get<Project[]>('/projects', {
      params: { workspace_id: workspaceId },
    });
    return res.data;
  },

  getById: async (id: string): Promise<Project> => {
    const res = await apiClient.get<Project>(`/projects/${id}`);
    return res.data;
  },

  create: async (data: {
    workspace_id: string;
    name: string;
    identifier: string;
    description?: string;
    color?: string;
    cover_url?: string;
    visibility?: string;
  }): Promise<Project> => {
    const res = await apiClient.post<Project>('/projects', data);
    return res.data;
  },

  update: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      color?: string;
      cover_url?: string;
      visibility?: string;
    }
  ): Promise<Project> => {
    const res = await apiClient.put<Project>(`/projects/${id}`, data);
    return res.data;
  },

  archive: async (id: string, archive: boolean): Promise<void> => {
    await apiClient.post(`/projects/${id}/archive`, { archive });
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};
