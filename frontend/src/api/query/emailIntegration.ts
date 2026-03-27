import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { EmailIntegrationStatus, SyncJobStatus } from '@/api/dataInterface';

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

export function useSyncJobStatusQuery(jobId: string | null) {
  return useQuery<SyncJobStatus>({
    queryKey: ['sync-job-status', jobId],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/email-integration/sync-status/${jobId}`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling once the job reaches a terminal state
      return status === 'done' || status === 'failed' ? false : 5000;
    },
    staleTime: 0,
  });
}
