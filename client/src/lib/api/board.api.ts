import { apiClient } from './client';
import type { Board, BoardColumn } from '@/types';

export const boardApi = {
  getByProject: async (projectId: string): Promise<Board> => {
    const res = await apiClient.get<Board>(`/boards/project/${projectId}`);
    return res.data;
  },

  createColumn: async (
    boardId: string,
    data: { name: string; type_?: string; position?: number; wip_limit?: number }
  ): Promise<BoardColumn> => {
    const res = await apiClient.post<BoardColumn>(`/boards/${boardId}/columns`, data);
    return res.data;
  },

  updateColumn: async (
    columnId: string,
    data: { name?: string; type_?: string; position?: number; wip_limit?: number }
  ): Promise<BoardColumn> => {
    const res = await apiClient.put<BoardColumn>(`/boards/columns/${columnId}`, data);
    return res.data;
  },

  deleteColumn: async (columnId: string): Promise<void> => {
    await apiClient.delete(`/boards/columns/${columnId}`);
  },

  reorderColumns: async (boardId: string, columnIds: string[]): Promise<void> => {
    await apiClient.post(`/boards/${boardId}/columns/reorder`, { column_ids: columnIds });
  },
};
