import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { RecurringDeposit } from '../../types';

export function useRecurringDepositsQuery() {
  return useQuery<RecurringDeposit[]>({
    queryKey: ['recurring-deposits-fetch'],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: '/recurring-deposit/getDeposits',
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 120 * 60 * 1000, // Cache for 120 minutes
  });
}
