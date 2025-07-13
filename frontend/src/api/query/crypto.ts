import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import {
  CryptoTransaction,
  CryptoPortfolioResponse,
  CoinDCXUserBalanceResponse,
  CoinPricesResponse,
  CoinCandle,
} from '@/api/dataInterface';

export function useCryptoTransactionsQuery() {
  return useQuery<CryptoTransaction[]>({
    queryKey: ['crypto-transactions'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/crypto/transactions', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useCryptoPortfolioQuery() {
  return useQuery<CryptoPortfolioResponse>({
    queryKey: ['crypto-portfolio'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/crypto/portfolio', method: 'GET' });
      return response;
    },
    staleTime: 30 * 1000, // Cache for 30 seconds (frequent price updates)
    refetchInterval: 60 * 1000, // Refetch every minute for live prices
  });
}

export function useCryptoUserBalanceQuery() {
  return useQuery<CoinDCXUserBalanceResponse>({
    queryKey: ['crypto-user-balances'],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: '/crypto/getUserCryptoBalance',
        method: 'GET',
      });
      return response;
    },
    staleTime: 60 * 1000 * 5, // Cache for 5 minutes
    refetchInterval: 60 * 1000 * 10, // Refetch every 10 minutes
  });
}

export function useCryptoCoinPricesQuery(coinNames: string[]) {
  return useQuery<CoinPricesResponse>({
    queryKey: ['crypto-prices', coinNames],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: '/crypto/getCoinPrices',
        method: 'POST',
        body: coinNames,
      });
      return response;
    },
    staleTime: 60 * 1000 * 2, // Cache for 2 minutes
    refetchInterval: 60 * 1000 * 5, // Refetch every 5 minutes
    enabled: coinNames.length > 0, // Only run if coinNames array is not empty
  });
}

// Helper to round to nearest 5 minutes
function getRoundedEndTime(minutes = 5) {
  const now = Date.now();
  return now - (now % (minutes * 60 * 1000));
}

export function useCoinCandlesQuery(symbol: string, interval: string = '1d', limit: number = 365) {
  const endTime = getRoundedEndTime(5); // 5 minutes
  const startTime = endTime - limit * 24 * 60 * 60 * 1000;

  return useQuery<CoinCandle[]>({
    queryKey: ['coin-candles', symbol, interval, limit, endTime],
    queryFn: async () => {
      if (!symbol) return [];
      const params = new URLSearchParams({
        symbol,
        interval,
        limit: String(limit),
        startTime: String(startTime),
        endTime: String(endTime),
      });
      const response = await apiRequest({
        endpoint: `/crypto/candles?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!symbol,
  });
}
