import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import {
  StockSearchResponse,
  StockTransaction,
  StocksPortfolioResponse,
  StockFinancials,
} from '@/api/dataInterface';

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
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
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

export function useStocksPortfolioQuery() {
  return useQuery<StocksPortfolioResponse>({
    queryKey: ['stocks-portfolio'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/stocks/portfolio', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
  });
}

export function useStockFullProfile(symbol: string, range?: string, interval?: string) {
  return useQuery({
    queryKey: ['stock-full-profile', symbol, range, interval],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/stocks/stock-profile?symbol=${symbol}&range=${range}&interval=${interval}`,
      });
      return response.data;
    },
    enabled: !!symbol,
  });
}

export function useStockFinancialsQuery(symbol: string) {
  return useQuery<StockFinancials>({
    queryKey: ['stock-financials', symbol],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/stocks/financials?symbol=${encodeURIComponent(symbol)}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!symbol,
  });
}
