import { useQuery } from '@tanstack/react-query';
import { labelApi } from '@/lib/api/label.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useLabels = (workspaceId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.labels.byWorkspace(workspaceId || ''),
    queryFn: () => labelApi.listByWorkspace(workspaceId!),
    enabled: !!workspaceId,
  });
};
