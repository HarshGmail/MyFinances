import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { UserGoal } from '../dataInterface';

export function useUserGoalsQuery() {
  const query = useQuery<UserGoal[]>({
    queryKey: ['user-goals'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/goals', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  return {
    ...query,
    isSuccess: query.isSuccess,
    isError: query.isError,
    isFetching: query.isFetching,
  };
}
