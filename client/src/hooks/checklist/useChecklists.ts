import { useQuery } from '@tanstack/react-query';
import { checklistApi } from '@/lib/api/checklist.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useChecklists = (cardId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.checklists.byCard(cardId || ''),
    queryFn: () => checklistApi.listByCard(cardId!),
    enabled: !!cardId,
  });
};
