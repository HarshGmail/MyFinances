import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import {
  ParsedMFTransaction,
  ParsedGoldTransaction,
  ParsedEmailStockHolding,
  ParsedCryptoEmailTransaction,
} from '@/api/dataInterface';

async function syncEmails(): Promise<{ jobId: string }> {
  const response = await apiRequest({ endpoint: '/email-integration/sync', method: 'POST' });
  return response.data;
}

export function useEmailSyncMutation() {
  return useMutation({ mutationFn: syncEmails });
}

async function importTransactions(data: {
  mutualFunds: ParsedMFTransaction[];
  gold: ParsedGoldTransaction[];
  stocks: ParsedEmailStockHolding[];
  crypto: ParsedCryptoEmailTransaction[];
}): Promise<{
  importedMF: number;
  importedGold: number;
  importedStocks: number;
  importedCrypto: number;
  total: number;
}> {
  const response = await apiRequest({
    endpoint: '/email-integration/import',
    method: 'POST',
    body: data,
  });
  return response.data;
}

export function useEmailImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importTransactions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['goldTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['stockTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['cryptoTransactions'] });
    },
  });
}

async function resetEmailSync(email: string) {
  return apiRequest({ endpoint: '/email-integration/reset-sync', method: 'POST', body: { email } });
}

export function useEmailResetSyncMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetEmailSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-integration-status'] });
    },
  });
}

async function disconnectEmail(email: string) {
  return apiRequest({
    endpoint: `/email-integration/disconnect?email=${encodeURIComponent(email)}`,
    method: 'DELETE',
  });
}

export function useEmailDisconnectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-integration-status'] });
    },
  });
}

async function updateEmailSettings(data: { email: string; safegoldSender: string }) {
  return apiRequest({ endpoint: '/email-integration/settings', method: 'PUT', body: data });
}

export function useEmailUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEmailSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-integration-status'] });
    },
  });
}
