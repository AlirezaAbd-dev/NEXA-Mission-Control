import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardApi } from "@/lib/api/card.api";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useUpdateCard = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      title?: string;
      description?: string;
      priority?: string;
      column_id?: string;
      position?: number;
      due_date?: string;
      start_date?: string;
      estimated_hours?: number;
      cover_url?: string;
      story_points?: number | null;
      is_template?: boolean;
    }) => cardApi.update(data.id, data),

    onSuccess: (card) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.cards.byProject(projectId),
      });
      queryClient.setQueryData(QUERY_KEYS.cards.detail(card.id), card);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productivity.all });
    },
  });
};
