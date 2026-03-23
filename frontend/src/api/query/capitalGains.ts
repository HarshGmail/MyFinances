import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';

export function useCapitalGainsQuery() {
  return useQuery({
    queryKey: ['capital-gains'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/capital-gains', method: 'GET' });
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
}
