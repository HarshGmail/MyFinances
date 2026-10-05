import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';
import {
  ParsedMFTransaction,
  ParsedGoldTransaction,
  ParsedEmailStockHolding,
  ParsedCryptoEmailTransaction,
  SyncSource,
} from '../../types';

async function syncEmails(sources?: SyncSource[]): Promise<{ jobId: string }> {
  const response = await apiRequest({
    endpoint: '/email-integration/sync',
    method: 'POST',
    body: sources && sources.length > 0 ? { sources } : undefined,
  });
  return response.data;
}

export function useEmailSyncMutation() {
  return useMutation({ mutationFn: (sources?: SyncSource[]) => syncEmails(sources) });
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
      queryClient.invalidateQueries({ queryKey: ['mutual-fund-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['goldTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['goldLeases'] });
      queryClient.invalidateQueries({ queryKey: ['stock-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['crypto-transactions'] });
    },
  });
}

async function resetEmailSync({ email, sources }: { email: string; sources?: SyncSource[] }) {
  return apiRequest({
    endpoint: '/email-integration/reset-sync',
    method: 'POST',
    body: sources && sources.length > 0 ? { email, sources } : { email },
  });
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

async function cancelSync(jobId: string) {
  return apiRequest({
    endpoint: `/email-integration/sync/${jobId}/cancel`,
    method: 'POST',
  });
}

export function useCancelSyncMutation() {
  return useMutation({ mutationFn: cancelSync });
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

async function updateCustomPdfPasswords(passwords: string[]): Promise<{ passwords: string[] }> {
  const response = await apiRequest({
    endpoint: '/email-integration/custom-passwords',
    method: 'PUT',
    body: { passwords },
  });
  return response.data;
}

export function useUpdateCustomPdfPasswordsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCustomPdfPasswords,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-pdf-passwords'] });
    },
  });
}
