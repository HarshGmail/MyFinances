import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { StockSearchResponse, StockTransaction } from '@/api/dataInterface';

export function useStockTransactionsQuery() {
  return useQuery<StockTransaction[]>({
    queryKey: ['stock-transactions'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/stocks/transactions', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
    enabled: symbols.length > 0,
  });
}

export function useSearchStockByNameQuery(symbol: string) {
  return useQuery<StockSearchResponse[]>({
    queryKey: ['stock-stock-name', symbol],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/stocks/search?query=${symbol}`,
        method: 'GET',
      });
      return Array.isArray(response?.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: symbol.length > 3,
  });
}

export function useStockFullProfile(symbol: string, range?: '1y', interval?: '1d') {
  return useQuery({
    queryKey: ['stock-full-profile', symbol, range, interval],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/stocks/stock-profile?symbol=${symbol}&range=${range}&interval=${interval}`,
      });
      return response.data;
    },
  });
}
