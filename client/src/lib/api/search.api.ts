import { apiClient } from './client';
import type { SearchResultItem } from '@/types';

export const searchApi = {
  search: async (q: string): Promise<SearchResultItem[]> => {
    const res = await apiClient.get<SearchResultItem[]>('/search', { params: { q } });
    return res.data;
  },
};
