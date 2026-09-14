import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';

export interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
}

export function usePushConfigQuery() {
  return useQuery<PushConfig>({
    queryKey: ['push-config'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/push/config', method: 'GET' });
      return response.data;
    },
    staleTime: 60 * 60 * 1000,
  });
}
