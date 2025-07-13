import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { MutualFundTransaction } from '@/api/dataInterface';

export function useMutualFundTransactionsQuery() {
  return useQuery<MutualFundTransaction[]>({
    queryKey: ['mutual-fund-transactions'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/mutual-funds/transactions', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
