import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';

export interface StockTransactionPayload {
  type: 'credit' | 'debit';
  date: string;
  marketPrice: number;
  numOfShares: number;
  amount: number;
  stockName: string;
}

async function addStockTransaction(data: StockTransactionPayload) {
  return apiRequest({
    endpoint: '/stocks/transaction',
    method: 'POST',
    body: data,
  });
}

export function useAddStockTransactionMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addStockTransaction,
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
