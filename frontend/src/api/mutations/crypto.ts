import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';

export interface CryptoTransactionPayload {
  type: 'credit' | 'debit';
  date: string;
  coinPrice: number;
  quantity: number;
  amount: number;
  coinName: string;
}

async function addCryptoTransaction(data: CryptoTransactionPayload) {
  return apiRequest({
    endpoint: '/crypto/transaction',
    method: 'POST',
    body: data,
  });
}

export function useAddCryptoTransactionMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addCryptoTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-transactions'] });
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
