import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';

export interface CryptoTransactionPayload {
  type: 'credit' | 'debit';
  date: string;
  coinPrice: number;
  quantity: number;
  amount: number;
  coinName: string;
  coinSymbol: string;
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

export interface CryptoTransactionUpdatePayload extends CryptoTransactionPayload {
  id: string;
}

async function updateCryptoTransaction(data: CryptoTransactionUpdatePayload) {
  return apiRequest({
    endpoint: `/crypto/transaction/${data.id}`,
    method: 'PUT',
    body: {
      type: data.type,
      date: data.date,
      coinPrice: data.coinPrice,
      quantity: data.quantity,
      amount: data.amount,
      coinName: data.coinName,
      coinSymbol: data.coinSymbol,
    },
  });
}

export function useUpdateCryptoTransactionMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateCryptoTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-transactions'] });
    },
  });

  return {
    ...mutation,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}

export async function deleteCryptoTransaction(id: string) {
  return apiRequest({
    endpoint: `/crypto/transaction/${id}`,
    method: 'DELETE',
  });
}

export function useDeleteCryptoTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCryptoTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-transactions'] });
    },
  });
}
