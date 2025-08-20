import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { GoldTransaction, SafeGoldRatesResponse } from '@/api/dataInterface';

export function useGoldTransactionsQuery() {
  return useQuery<GoldTransaction[]>({
    queryKey: ['goldTransactions'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/gold/transactions', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Uncomment to cache for 5 minutes
  });
}

export function useSafeGoldRatesQuery({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  return useQuery<SafeGoldRatesResponse>({
    queryKey: ['safe-gold-rates', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      const response = await apiRequest({
        endpoint: `/gold/safe-gold-rates?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
    refetchInterval: 1 * 60 * 1000,
  });
}
