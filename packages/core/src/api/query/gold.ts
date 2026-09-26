import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { GoldLeasesResponse, GoldTransaction, SafeGoldRatesResponse } from '../../types';

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

export function useGoldLeasesQuery() {
  return useQuery<GoldLeasesResponse>({
    queryKey: ['goldLeases'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/gold/leases', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
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
      return await apiRequest({
        endpoint: `/gold/safe-gold-rates?${params.toString()}`,
        method: 'GET',
      });
    },
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
  });
}
