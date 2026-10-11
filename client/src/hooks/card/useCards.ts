import { useQuery } from '@tanstack/react-query';
import { cardApi, type ListCardsFilter } from '@/lib/api/card.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCards = (filters: ListCardsFilter) => {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.cards.byProject(filters.project_id),
      filters.column_id,
      filters.search,
      filters.priority,
      filters.assignee_id,
      filters.label_id,
      filters.archived,
    ],
    queryFn: () => cardApi.list(filters),
    enabled: !!filters.project_id,
  });
};
