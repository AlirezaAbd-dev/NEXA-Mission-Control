import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timeLogApi } from "@/lib/api/timeLog.api";
import { QUERY_KEYS } from "@/constants/queryKeys";

export const useTimeLogs = (cardId?: string | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.timeLogs.byCard(cardId || ""),
    queryFn: () => timeLogApi.list(cardId!),
    enabled: !!cardId,
  });
};

export const useCreateTimeLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      card_id: string;
      minutes: number;
      description?: string;
    }) => timeLogApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.timeLogs.byCard(variables.card_id),
      });
    },
  });
};

export const useDeleteTimeLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; cardId: string }) =>
      timeLogApi.delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.timeLogs.byCard(variables.cardId),
      });
    },
  });
};
