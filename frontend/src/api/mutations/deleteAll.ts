import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';

async function deleteAllStocks() {
  return apiRequest({ endpoint: '/stocks/all', method: 'DELETE' });
}

async function deleteAllGold() {
  return apiRequest({ endpoint: '/gold/all', method: 'DELETE' });
}

async function deleteAllCrypto() {
  return apiRequest({ endpoint: '/crypto/all', method: 'DELETE' });
}

async function deleteAllMutualFunds() {
  return apiRequest({ endpoint: '/mutual-funds/all', method: 'DELETE' });
}

async function deleteAllExpenses() {
  return apiRequest({ endpoint: '/expenses/all', method: 'DELETE' });
}

async function deleteAllExpenseTransactions() {
  return apiRequest({ endpoint: '/expense-transactions/all', method: 'DELETE' });
}

async function deleteAllEpf() {
  return apiRequest({ endpoint: '/epf/all', method: 'DELETE' });
}

async function deleteAllFixedDeposits() {
  return apiRequest({ endpoint: '/fixed-deposit/all', method: 'DELETE' });
}

async function deleteAllRecurringDeposits() {
  return apiRequest({ endpoint: '/recurring-deposit/all', method: 'DELETE' });
}

export function useDeleteAllStocksMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllStocks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-transactions'] }),
  });
}

export function useDeleteAllGoldMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllGold,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gold-transactions'] }),
  });
}

export function useDeleteAllCryptoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllCrypto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crypto-transactions'] }),
  });
}

export function useDeleteAllMutualFundsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllMutualFunds,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mutual-fund-transactions'] }),
  });
}

export function useDeleteAllExpensesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllExpenses,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteAllExpenseTransactionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllExpenseTransactions,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expense-transactions'] }),
  });
}

export function useDeleteAllEpfMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllEpf,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['epf-accounts'] }),
  });
}

export function useDeleteAllFixedDepositsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllFixedDeposits,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fixed-deposits'] }),
  });
}

export function useDeleteAllRecurringDepositsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllRecurringDeposits,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-deposits'] }),
  });
}
