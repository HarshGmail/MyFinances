import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { BulkExpensePayload, ExpensePayload, UpdateExpensePayload } from '../dataInterface';

async function addExpense(data: ExpensePayload) {
  return apiRequest({
    endpoint: '/expenses',
    method: 'POST',
    body: data,
  });
}

export function useAddExpenseMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: addExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
    },
    onError: (error) => {
      console.error('Error adding expense:', error);
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

async function updateExpense({ id, data }: UpdateExpensePayload) {
  return apiRequest({
    endpoint: `/expenses/${id}`,
    method: 'PUT',
    body: data,
  });
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateExpense,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expense', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
    },
    onError: (error) => {
      console.error('Error updating expense:', error);
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

async function deleteExpense(id: string) {
  return apiRequest({
    endpoint: `/expenses/${id}`,
    method: 'DELETE',
  });
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: ['expense', deletedId] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
    },
    onError: (error) => {
      console.error('Error deleting expense:', error);
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

async function bulkAddExpenses(data: BulkExpensePayload) {
  return apiRequest({
    endpoint: '/expenses/bulk',
    method: 'POST',
    body: data,
  });
}

export function useBulkAddExpensesMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: bulkAddExpenses,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
    },
    onError: (error) => {
      console.error('Error bulk adding expenses:', error);
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

async function bulkDeleteExpenses(ids: string[]) {
  return apiRequest({
    endpoint: '/expenses/bulk-delete',
    method: 'DELETE',
    body: { ids },
  });
}

export function useBulkDeleteExpensesMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: bulkDeleteExpenses,
    onSuccess: (_, deletedIds) => {
      deletedIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: ['expense', id] });
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
    },
    onError: (error) => {
      console.error('Error bulk deleting expenses:', error);
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

// Import expenses from CSV/Excel
async function importExpenses(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest({
    endpoint: '/expenses/import',
    method: 'POST',
    body: formData,
    headers: {
      // Let browser set Content-Type with boundary for multipart/form-data
    },
  });
}

export function useImportExpensesMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: importExpenses,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
    },
    onError: (error) => {
      console.error('Error importing expenses:', error);
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
