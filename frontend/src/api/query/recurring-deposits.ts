import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { RecurringDeposit } from '@/api/dataInterface';

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
