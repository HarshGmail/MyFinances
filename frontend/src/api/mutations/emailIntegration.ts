import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { EmailSyncPreview, ParsedMFTransaction, ParsedGoldTransaction } from '@/api/dataInterface';

async function syncEmails(): Promise<EmailSyncPreview> {
  const response = await apiRequest({ endpoint: '/email-integration/sync', method: 'POST' });
  return response.data;
}

export function useEmailSyncMutation() {
  return useMutation({ mutationFn: syncEmails });
}

async function importTransactions(data: {
  mutualFunds: ParsedMFTransaction[];
  gold: ParsedGoldTransaction[];
}): Promise<{ importedMF: number; importedGold: number; total: number }> {
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
    },
  });
}

async function resetEmailSync() {
  return apiRequest({ endpoint: '/email-integration/reset-sync', method: 'POST' });
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

async function disconnectEmail() {
  return apiRequest({ endpoint: '/email-integration/disconnect', method: 'DELETE' });
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

async function updateEmailSettings(data: { safegoldSender: string }) {
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
