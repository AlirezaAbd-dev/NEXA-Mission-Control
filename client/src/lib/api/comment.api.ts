import { apiClient } from "./client";
import type { CardComment } from "@/types";

export const commentApi = {
  listByCard: async (cardId: string): Promise<CardComment[]> => {
    const res = await apiClient.get<CardComment[]>("/comments", {
      params: { card_id: cardId },
    });
    return res.data;
  },

  create: async (
    cardId: string,
    body: string,
    is_internal = false,
  ): Promise<CardComment> => {
    const res = await apiClient.post<CardComment>("/comments", {
      card_id: cardId,
      body,
      is_internal,
    });
    return res.data;
  },

  update: async (commentId: string, body: string): Promise<CardComment> => {
    const res = await apiClient.put<CardComment>(`/comments/${commentId}`, {
      body,
    });
    return res.data;
  },

  delete: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`);
  },

  toggleReaction: async (commentId: string, emoji: string): Promise<void> => {
    await apiClient.post(`/comments/${commentId}/reaction`, { emoji });
  },
};
