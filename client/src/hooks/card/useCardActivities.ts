import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";

export interface Activity {
  id: string;
  workspace_id: string;
  project_id?: string | null;
  card_id?: string | null;
  actor_id?: string | null;
  actor_name: string;
  actor_avatar?: string | null;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export const useCardActivities = (cardId: string) => {
  return useQuery<Activity[]>({
    queryKey: QUERY_KEYS.activities.byCard(cardId),
    queryFn: async () => {
      const res = await apiClient.get<Activity[]>("/activities", {
        params: { card_id: cardId },
      });
      return res.data;
    },
    enabled: !!cardId,
  });
};
