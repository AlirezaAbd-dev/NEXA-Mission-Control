import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardApi } from "@/lib/api/card.api";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { Card } from "@/types";
export const useMoveCard = (projectId: string) => {
  const cache = useQueryClient(),
    key = QUERY_KEYS.cards.byProject(projectId);
  return useMutation({
    mutationFn: (data: { id: string; column_id: string; position: number }) =>
      cardApi.move(data.id, data.column_id, data.position),
    onMutate: async (patch) => {
      await cache.cancelQueries({ queryKey: key });
      const snapshots = cache.getQueriesData<Card[]>({ queryKey: key });
      cache.setQueriesData<Card[]>({ queryKey: key }, (cards) =>
        cards?.map((card) =>
          card.id === patch.id
            ? { ...card, column_id: patch.column_id, position: patch.position }
            : card,
        ),
      );
      return snapshots;
    },
    onError: (_error, _patch, snapshots) => {
      for (const [queryKey, data] of snapshots || [])
        cache.setQueryData(queryKey, data);
    },
    onSettled: () => cache.invalidateQueries({ queryKey: key }),
  });
};
