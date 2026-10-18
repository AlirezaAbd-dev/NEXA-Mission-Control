import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardApi } from "@/lib/api/card.api";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { applyCardPlacement } from "@/features/board/cardDrop";
import type { Card } from "@/types";
export const useMoveCard = (projectId: string) => {
  const cache = useQueryClient(),
    key = QUERY_KEYS.cards.byProject(projectId);
  return useMutation({
    mutationKey: key,
    mutationFn: (data: { id: string; column_id: string; position: number; placement?:{before_id:string|null} }) =>
      cardApi.move(data.id, data.column_id, data.position, data.placement),
    onMutate: (patch) => {
      void cache.cancelQueries({ queryKey: key });
      const snapshots = cache.getQueriesData<Card[]>({ queryKey: key });
      cache.setQueriesData<Card[]>({ queryKey: key }, (cards) =>
        patch.placement && cards ? applyCardPlacement(cards,patch.id,patch.column_id,patch.placement.before_id) : cards?.map((card) =>
          card.id === patch.id
            ? { ...card, column_id: patch.column_id, position: patch.position }
            : card,
        ),
      );
      return snapshots;
    },
    onError: (_error, patch, snapshots) => {
      for (const [queryKey, previous] of snapshots || []) {
        if (!previous) continue;
        const optimistic = patch.placement ? applyCardPlacement(previous,patch.id,patch.column_id,patch.placement.before_id) : previous.map(card=>card.id===patch.id?{...card,column_id:patch.column_id,position:patch.position}:card);
        cache.setQueryData<Card[]>(queryKey,cards=>cards?.map(card=>{
          const expected=optimistic.find(item=>item.id===card.id), original=previous.find(item=>item.id===card.id);
          return expected && original && expected.column_id===card.column_id && expected.position===card.position
            ? {...card,column_id:original.column_id,position:original.position} : card;
        }));
      }
    },
    onSettled: () => {
      if (cache.isMutating({mutationKey:key}) === 1)
        return cache.invalidateQueries({queryKey:key});
    },
  });
};
