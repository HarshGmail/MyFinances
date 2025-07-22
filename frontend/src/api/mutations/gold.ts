import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';

export interface GoldTransactionPayload {
  type: 'credit' | 'debit';
  date: Date;
  goldPrice: number;
  quantity: number;
  amount: number;
  tax: number;
  platform?: string;
}

async function addGoldTransaction(data: GoldTransactionPayload) {
  return apiRequest({
    endpoint: '/gold/transaction',
    method: 'POST',
    body: data,
  });
}

export function useAddGoldTransactionMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addGoldTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goldTransactions'] });
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
