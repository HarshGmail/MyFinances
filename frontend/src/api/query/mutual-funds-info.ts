import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { MutualFundInfo } from '@/api/dataInterface';

export function useMutualFundInfoFetchQuery() {
  return useQuery<MutualFundInfo[]>({
    queryKey: ['mutual-fund-info'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/funds/infoFetch', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useSearchMutualFundsQuery(query: string) {
  return useQuery({
    queryKey: ['search-mutual-funds', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const response = await apiRequest({
        endpoint: `/mutual-funds/search?query=${encodeURIComponent(query)}`,
        method: 'GET',
      });
      return response.data || [];
    },
    enabled: !!query && query.length >= 2,
    staleTime: 60 * 1000,
  });
}

export function useMfapiNavHistoryQuery(schemeNumber: string | number) {
  return useQuery({
    queryKey: ['mfapi-nav-history', schemeNumber],
    queryFn: async () => {
      if (!schemeNumber) return null;
      const params = new URLSearchParams({ schemeNumber: String(schemeNumber) });
      const response = await apiRequest({
        endpoint: `/funds/nav-history?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!schemeNumber,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMfapiNavHistoryBatchQuery(schemeNumbers: (string | number)[]) {
  return useQuery({
    queryKey: ['mfapi-nav-history-batch', schemeNumbers],
    queryFn: async () => {
      if (!schemeNumbers.length) return {};
      const response = await apiRequest({
        endpoint: '/funds/nav-history',
        method: 'POST',
        body: { schemeNumbers },
      });
      return response.data;
    },
    enabled: schemeNumbers.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
