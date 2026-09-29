import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { CapitalGainsResponse } from '../../types';

export function useCapitalGainsQuery() {
  return useQuery<CapitalGainsResponse>({
    queryKey: ['capital-gains'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/capital-gains', method: 'GET' });
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
}
