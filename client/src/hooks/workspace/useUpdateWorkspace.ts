import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceApi } from "@/lib/api/workspace.api";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useUpdateWorkspace = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; description?: string; logo_url?: string }) =>
      workspaceApi.update(workspaceId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.workspaces.detail(workspaceId), updated);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workspaces.all });
    },
  });
};
