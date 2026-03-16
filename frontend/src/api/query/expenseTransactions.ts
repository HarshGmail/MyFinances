import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { ExpenseTransaction } from '../dataInterface';

export function useExpenseTransactionsQuery(startDate?: string, endDate?: string) {
  return useQuery<ExpenseTransaction[]>({
    queryKey: ['expenseTransactions', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await apiRequest({
        endpoint: `/expense-transactions${query}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useExpenseTransactionNamesQuery() {
  return useQuery<string[]>({
    queryKey: ['expenseTransactionNames'],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: '/expense-transactions/names',
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
