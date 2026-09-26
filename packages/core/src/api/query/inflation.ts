import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { InflationResult } from '../../types';

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
