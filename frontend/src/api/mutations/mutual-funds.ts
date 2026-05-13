import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';

export interface MutualFundTransactionPayload {
  type: 'credit' | 'debit';
  date: string;
  fundPrice: number;
  numOfUnits: number;
  amount: number;
  fundName: string;
  platform?: string;
}

async function deleteMutualFundTransaction(id: string) {
  return apiRequest({ endpoint: `/mutual-funds/transaction/${id}`, method: 'DELETE' });
}
export function useDeleteMutualFundTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMutualFundTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mutual-fund-transactions'] }),
  });
}

async function addMutualFundTransaction(data: MutualFundTransactionPayload) {
  return apiRequest({
    endpoint: '/mutual-funds/transaction',
    method: 'POST',
    body: data,
  });
}

export function useAddMutualFundTransactionMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addMutualFundTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mutual-fund-transactions'] });
    },
  });

  const cancelRequest = () => {
    queryClient.cancelQueries();
  };

  return {
    ...mutation,
    cancelRequest,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
