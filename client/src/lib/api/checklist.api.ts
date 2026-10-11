import { apiClient } from './client';
import type { Checklist, ChecklistItem } from '@/types';

export const checklistApi = {
  listByCard: async (cardId: string): Promise<Checklist[]> => {
    const res = await apiClient.get<Checklist[]>('/checklists', { params: { card_id: cardId } });
    return res.data;
  },

  createChecklist: async (cardId: string, title: string): Promise<Checklist> => {
    const res = await apiClient.post<Checklist>('/checklists', { card_id: cardId, title });
    return res.data;
  },

  deleteChecklist: async (id: string): Promise<void> => {
    await apiClient.delete(`/checklists/${id}`);
  },

  createItem: async (checklistId: string, data: { title: string; assignee_id?: string; due_date?: string }): Promise<ChecklistItem> => {
    const res = await apiClient.post<ChecklistItem>(`/checklists/${checklistId}/items`, data);
    return res.data;
  },

  updateItem: async (
    itemId: string,
    data: { title?: string; is_done?: boolean; assignee_id?: string | null; due_date?: string | null }
  ): Promise<ChecklistItem> => {
    const res = await apiClient.put<ChecklistItem>(`/checklists/items/${itemId}`, data);
    return res.data;
  },

  deleteItem: async (itemId: string): Promise<void> => {
    await apiClient.delete(`/checklists/items/${itemId}`);
  },
};
