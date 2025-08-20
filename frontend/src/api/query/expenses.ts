import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { Expense, ExpenseSummary } from '../dataInterface';

// Get all expenses for the authenticated user
export function useExpensesQuery() {
  return useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: '/expenses',
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Get a single expense by ID
export function useExpenseByIdQuery(expenseId: string) {
  return useQuery<Expense>({
    queryKey: ['expense', expenseId],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/expenses/${expenseId}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!expenseId, // Only run if expenseId exists
  });
}

// Get expenses filtered by tag
export function useExpensesByTagQuery(tag: string) {
  return useQuery<Expense[]>({
    queryKey: ['expenses', 'tag', tag],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/expenses/tag/${encodeURIComponent(tag)}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!tag, // Only run if tag exists
  });
}

// Get expenses filtered by frequency
export function useExpensesByFrequencyQuery(frequency: string) {
  return useQuery<Expense[]>({
    queryKey: ['expenses', 'frequency', frequency],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/expenses/frequency/${encodeURIComponent(frequency)}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!frequency, // Only run if frequency exists
  });
}

// Get expense summary/statistics (if you have this endpoint)
export function useExpenseSummaryQuery() {
  return useQuery<ExpenseSummary>({
    queryKey: ['expense-summary'],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: '/expenses/summary',
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// Search expenses by name
export function useSearchExpensesQuery(searchTerm: string) {
  return useQuery<Expense[]>({
    queryKey: ['expenses', 'search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const response = await apiRequest({
        endpoint: `/expenses/search?q=${encodeURIComponent(searchTerm)}`,
        method: 'GET',
      });
      return response.data || [];
    },
    enabled: !!searchTerm && searchTerm.length >= 2,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

// Get expenses with pagination
export function useExpensesPaginatedQuery(page: number = 1, limit: number = 10) {
  return useQuery<{
    expenses: Expense[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }>({
    queryKey: ['expenses', 'paginated', page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const response = await apiRequest({
        endpoint: `/expenses/paginated?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}

// Get expenses within a date range
export function useExpensesByDateRangeQuery(startDate: string, endDate: string) {
  return useQuery<Expense[]>({
    queryKey: ['expenses', 'dateRange', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      const response = await apiRequest({
        endpoint: `/expenses/date-range?${params.toString()}`,
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!startDate && !!endDate,
  });
}
