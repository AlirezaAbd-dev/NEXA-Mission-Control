import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardApi } from "@/lib/api/card.api";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useUiStore } from "@/stores/ui.store";

export function useDeleteArchivedCard(projectId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: cardApi.deletePermanently,
    onSuccess: async (_, id) => {
      if (useUiStore.getState().activeCardId === id) useUiStore.getState().closeCardModal();
      cache.removeQueries({ queryKey: QUERY_KEYS.cards.detail(id), exact: true });
      await Promise.all([
        cache.invalidateQueries({ queryKey: QUERY_KEYS.cards.byProject(projectId) }),
        cache.invalidateQueries({ queryKey: QUERY_KEYS.enterprise.project(projectId) }),
        cache.invalidateQueries({ queryKey: QUERY_KEYS.productivity.all }),
        cache.invalidateQueries({ queryKey: QUERY_KEYS.localops.resource(projectId, "tickets") }),
        cache.invalidateQueries({ queryKey: QUERY_KEYS.search.all }),
        cache.invalidateQueries({ queryKey: QUERY_KEYS.workspaces.all }),
      ]);
    },
  });
}
