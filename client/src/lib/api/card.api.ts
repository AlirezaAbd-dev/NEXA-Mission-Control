import { apiClient } from './client';
import type { Card } from '@/types';

export interface ListCardsFilter {
  project_id: string;
  column_id?: string;
  search?: string;
  priority?: string;
  assignee_id?: string;
  label_id?: string;
  archived?: boolean;
}

export const cardApi = {
  list: async (filters: ListCardsFilter): Promise<Card[]> => {
    const res = await apiClient.get<Card[]>('/cards', { params: filters });
    return res.data;
  },

  getById: async (id: string): Promise<Card> => {
    const res = await apiClient.get<Card>(`/cards/${id}`);
    return res.data;
  },

  create: async (data: {
    project_id: string;
    column_id: string;
    title: string;
    description?: string;
    priority?: string;
    position?: number;
    due_date?: string;
    start_date?: string;
    estimated_hours?: number;
    assignee_ids?: string[];
    label_ids?: string[];
  }): Promise<Card> => {
    const res = await apiClient.post<Card>('/cards', data);
    return res.data;
  },

  update: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      priority?: string;
      column_id?: string;
      position?: number;
      due_date?: string;
      start_date?: string;
      estimated_hours?: number;
      cover_url?: string;
    }
  ): Promise<Card> => {
    const res = await apiClient.put<Card>(`/cards/${id}`, data);
    return res.data;
  },

  move: async (id: string, column_id: string, position: number): Promise<void> => {
    await apiClient.post(`/cards/${id}/move`, { column_id, position });
  },

  archive: async (id: string, archive: boolean): Promise<void> => {
    await apiClient.post(`/cards/${id}/archive`, { archive });
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/cards/${id}`);
  },

  setAssignees: async (id: string, userIds: string[]): Promise<Card> => {
    const res = await apiClient.put<Card>(`/cards/${id}/assignees`, { user_ids: userIds });
    return res.data;
  },

  setLabels: async (id: string, labelIds: string[]): Promise<Card> => {
    const res = await apiClient.put<Card>(`/cards/${id}/labels`, { label_ids: labelIds });
    return res.data;
  },
};
