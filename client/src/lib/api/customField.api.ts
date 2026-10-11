import { apiClient } from './client';
import type { CustomFieldDefinition, CustomFieldValue } from '@/types';

export const customFieldApi = {
  listDefinitions: async (projectId: string): Promise<CustomFieldDefinition[]> => {
    const res = await apiClient.get<CustomFieldDefinition[]>('/custom-fields/definitions', {
      params: { project_id: projectId },
    });
    return res.data;
  },

  createDefinition: async (data: {
    project_id: string;
    name: string;
    field_type: string;
    options?: string[];
    position?: number;
  }): Promise<CustomFieldDefinition> => {
    const res = await apiClient.post<CustomFieldDefinition>('/custom-fields/definitions', data);
    return res.data;
  },

  deleteDefinition: async (id: string): Promise<void> => {
    await apiClient.delete(`/custom-fields/definitions/${id}`);
  },

  listValues: async (cardId: string): Promise<CustomFieldValue[]> => {
    const res = await apiClient.get<CustomFieldValue[]>('/custom-fields/values', {
      params: { card_id: cardId },
    });
    return res.data;
  },

  setValue: async (data: {
    card_id: string;
    field_id: string;
    value_text?: string | null;
    value_number?: number | null;
  }): Promise<CustomFieldValue[]> => {
    const res = await apiClient.post<CustomFieldValue[]>('/custom-fields/values', data);
    return res.data;
  },
};
