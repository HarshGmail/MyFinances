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
      queryClient.invalidateQueries({ queryKey: ['mutual-funds'] });
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
