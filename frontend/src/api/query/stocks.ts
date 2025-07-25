import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { StockTransaction } from '@/api/dataInterface';

export function useStockTransactionsQuery() {
  return useQuery<StockTransaction[]>({
    queryKey: ['stock-transactions'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/stocks/transactions', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useNseQuoteQuery(symbols: string[]) {
  return useQuery({
    queryKey: ['stock-nse-quote', symbols],
    queryFn: async () => {
      const symbolParam = symbols.join(',');
      const response = await apiRequest({
        endpoint: `/stocks/nse-quote?symbols=${symbolParam}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: symbols.length > 0,
  });
}
