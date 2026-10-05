import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { CreditCardPayload } from '../../types';

const CREDIT_CARD_QUERY_KEYS = [
  'credit-cards',
  'credit-card-statements',
  'credit-card-transactions',
  'credit-card-alerts',
] as const;

export function invalidateCreditCardQueries(queryClient: QueryClient) {
  for (const key of CREDIT_CARD_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function useAddCreditCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreditCardPayload) =>
      apiRequest({ endpoint: '/credit-cards', method: 'POST', body: data }),
    onSuccess: () => invalidateCreditCardQueries(queryClient),
  });
}

export function useUpdateCreditCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreditCardPayload> }) =>
      apiRequest({ endpoint: `/credit-cards/${id}`, method: 'PUT', body: data }),
    onSuccess: () => invalidateCreditCardQueries(queryClient),
  });
}

export function useDeleteCreditCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest({ endpoint: `/credit-cards/${id}`, method: 'DELETE' }),
    onSuccess: () => invalidateCreditCardQueries(queryClient),
  });
}

export function useCreditCardSyncMutation() {
  return useMutation({
    mutationFn: async (): Promise<{ jobId: string }> => {
      const response = await apiRequest({ endpoint: '/credit-cards/sync', method: 'POST' });
      return response.data;
    },
  });
}

export function useResetCardSyncMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest({ endpoint: `/credit-cards/${id}/reset-sync`, method: 'POST' }),
    onSuccess: () => invalidateCreditCardQueries(queryClient),
  });
}
