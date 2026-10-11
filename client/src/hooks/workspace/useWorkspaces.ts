import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '@/lib/api/workspace.api';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { useAuthStore } from '@/stores/auth.store';

export const useWorkspaces = () => {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: QUERY_KEYS.workspaces.all,
    queryFn: () => workspaceApi.list(),
    enabled: !!token,
  });
};
