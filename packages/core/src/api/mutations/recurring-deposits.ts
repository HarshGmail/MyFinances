import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { RecurringDepositPayload } from '../../types';

async function recurringDeposit(data: RecurringDepositPayload) {
  return apiRequest({
    endpoint: '/recurring-deposit/addDeposit',
    method: 'POST',
    body: data,
  });
}

export function useRecurringDepositMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: recurringDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-deposits-fetch'] });
    },
  });

  const cancelRequest = () => {
    queryClient.cancelQueries({ queryKey: ['recurring-deposits-fetch'] });
  };

  return {
    ...mutation,
    cancelRequest,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}

export function useUpdateRecurringDepositMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecurringDepositPayload> }) =>
      apiRequest({ endpoint: `/recurring-deposit/${id}`, method: 'PUT', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-deposits-fetch'] }),
  });
}

export function useDeleteRecurringDepositMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest({ endpoint: `/recurring-deposit/${id}`, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-deposits-fetch'] }),
  });
}
