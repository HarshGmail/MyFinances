import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { EpfAccount, EpfTimelineSummary } from '@/api/dataInterface';

export function useEpfQuery() {
  return useQuery<EpfAccount[]>({
    queryKey: ['epf-account'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/epf/getInfo', method: 'GET' });
      return response.data;
    },
    staleTime: 90 * 60 * 1000, // cache for 90 min
  });
}

export const useEpfTimelineQuery = () => {
  return useQuery<EpfTimelineSummary>({
    queryKey: ['epf-timeline'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/epf/timeline', method: 'GET' });
      return response.data;
    },
    staleTime: 90 * 60 * 1000, // cache for 90 min
  });
};
