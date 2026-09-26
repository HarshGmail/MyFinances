import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';

function invalidateStockQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['stock-transactions'] });
  queryClient.invalidateQueries({ queryKey: ['stocks-portfolio'] });
}

export interface StockTransactionPayload {
  type: 'credit' | 'debit';
  date: string;
  marketPrice: number;
  numOfShares: number;
  amount: number;
  stockName: string;
}

export interface StockTransactionUpdatePayload extends StockTransactionPayload {
  id: string;
}

async function addStockTransaction(data: StockTransactionPayload) {
  return apiRequest({
    endpoint: '/stocks/transaction',
    method: 'POST',
    body: data,
  });
}

async function updateStockTransaction(data: StockTransactionUpdatePayload) {
  const { id, ...body } = data;
  return apiRequest({
    endpoint: `/stocks/transaction/${id}`,
    method: 'PUT',
    body,
  });
}

export function useAddStockTransactionMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addStockTransaction,
    onSuccess: () => {
      invalidateStockQueries(queryClient);
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

export function useUpdateStockTransactionMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateStockTransaction,
    onSuccess: () => {
      invalidateStockQueries(queryClient);
    },
  });

  return {
    ...mutation,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}

export async function deleteStockTransaction(id: string) {
  return apiRequest({
    endpoint: `/stocks/transaction/${id}`,
    method: 'DELETE',
  });
}

export function useDeleteStockTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStockTransaction,
    onSuccess: () => {
      invalidateStockQueries(queryClient);
    },
  });
}
