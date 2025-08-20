import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { InflationResult } from '@/api/dataInterface';

export function useInflationQuery(numOfYears: number) {
  return useQuery<InflationResult>({
    queryKey: ['inflation', numOfYears],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/inflation?numOfYears=${numOfYears}`,
        method: 'GET',
      });
      return response.data;
    },
  });
}
