import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeLogApi } from '@/lib/api/timeLog.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useActiveTimer = (cardId?: string | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.timeLogs.activeTimer(cardId || ''),
    queryFn: () => timeLogApi.getActiveTimer(cardId!),
    enabled: !!cardId,
    refetchInterval: 10000, // Poll active timer status periodically
  });
};

export const useStartTimer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, description }: { cardId: string; description?: string }) =>
      timeLogApi.startTimer(cardId, description),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(QUERY_KEYS.timeLogs.activeTimer(variables.cardId), data);
    },
  });
};

export const useStopTimer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, description }: { cardId: string; description?: string }) =>
      timeLogApi.stopTimer(cardId, description),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(QUERY_KEYS.timeLogs.activeTimer(variables.cardId), null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeLogs.byCard(variables.cardId) });
    },
  });
};
