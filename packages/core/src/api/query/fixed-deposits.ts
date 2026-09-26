import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { FixedDeposit } from '../../types';

export function useFixedDepositsQuery() {
  return useQuery<FixedDeposit[]>({
    queryKey: ['fixed-deposits-fetch'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/fixed-deposit/getDeposits', method: 'GET' });
      return response.data;
    },
    staleTime: 120 * 60 * 1000, // Cache for 120 minutes
  });
}
