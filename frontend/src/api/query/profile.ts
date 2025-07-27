import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { UserProfile } from '@/api/dataInterface';

export function useUserProfileQuery() {
  return useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/auth/profile', method: 'GET' });
      return response.data;
    },
    staleTime: 180 * 60 * 1000, // cache for 180 min
  });
}
