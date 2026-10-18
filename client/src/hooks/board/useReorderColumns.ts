import { useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/lib/api/board.api";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { Board } from "@/types";
export const useReorderColumns = (projectId: string, boardId: string) => {
  const cache = useQueryClient();
  const key = QUERY_KEYS.boards.byProject(projectId);
  return useMutation({
    mutationFn: (columnIds: string[]) => boardApi.reorderColumns(boardId,columnIds),
    onMutate: async (ids) => {
      await cache.cancelQueries({queryKey:key});
      const previous = cache.getQueryData<Board>(key);
      cache.setQueryData<Board>(key, board => board ? {...board, columns:ids.flatMap((id,index) => {
        const column = board.columns.find(c => c.id === id);
        return column ? [{...column,position:(index+1)*1000}] : [];
      })} : board);
      return {previous};
    },
    onError: (_error,_ids,context) => { if(context?.previous) cache.setQueryData(key,context.previous); },
    onSettled: () => { cache.invalidateQueries({queryKey:key}); cache.invalidateQueries({queryKey:QUERY_KEYS.enterprise.project(projectId)}); },
  });
};
