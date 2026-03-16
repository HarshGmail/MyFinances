import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { ExpenseTransactionPayload, UpdateExpenseTransactionPayload } from '../dataInterface';

async function addExpenseTransaction(data: ExpenseTransactionPayload) {
  return apiRequest({
    endpoint: '/expense-transactions',
    method: 'POST',
    body: data,
  });
}

export function useAddExpenseTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addExpenseTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['expenseTransactionNames'] });
    },
  });
}

async function updateExpenseTransaction({ id, data }: UpdateExpenseTransactionPayload) {
  return apiRequest({
    endpoint: `/expense-transactions/${id}`,
    method: 'PUT',
    body: data,
  });
}

export function useUpdateExpenseTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateExpenseTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseTransactions'] });
    },
  });
}

async function deleteExpenseTransaction(id: string) {
  return apiRequest({
    endpoint: `/expense-transactions/${id}`,
    method: 'DELETE',
  });
}

export function useDeleteExpenseTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteExpenseTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseTransactions'] });
    },
  });
}
