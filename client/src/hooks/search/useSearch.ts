import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api/search.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useSearch = (q: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.search.query(q),
    queryFn: () => searchApi.search(q),
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  });
};
