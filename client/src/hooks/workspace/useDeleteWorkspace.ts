import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceApi } from "@/lib/api/workspace.api";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => workspaceApi.delete(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workspaces.all });
    },
  });
};
