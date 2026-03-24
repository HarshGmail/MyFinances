import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { EmailIntegrationStatus } from '@/api/dataInterface';

export function useEmailIntegrationStatusQuery() {
  return useQuery<EmailIntegrationStatus>({
    queryKey: ['email-integration-status'],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/email-integration/status', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
