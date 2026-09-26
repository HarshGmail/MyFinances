import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { VAULT_META_QUERY_KEY } from '../query/vault';
import {
  VaultInitPayload,
  VaultItemPayload,
  VaultItemRecord,
  VaultRekeyPayload,
  VaultUnlockResponse,
} from '../../types';

export async function requestVaultUnlock(): Promise<VaultUnlockResponse> {
  const response = await apiRequest({ endpoint: '/vault/unlock', method: 'POST' });
  return response.data;
}

export async function confirmVaultUnlock(): Promise<void> {
  await apiRequest({ endpoint: '/vault/unlock/confirm', method: 'POST' });
}

export async function fetchVaultItems(): Promise<VaultItemRecord[]> {
  const response = await apiRequest({ endpoint: '/vault/items', method: 'GET' });
  return response.data;
}

async function initVault(payload: VaultInitPayload) {
  return apiRequest({ endpoint: '/vault/init', method: 'POST', body: payload });
}

export function useInitVaultMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: initVault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VAULT_META_QUERY_KEY });
    },
  });
}

async function saveVaultItem({ itemId, category, ciphertext }: VaultItemPayload) {
  return apiRequest({
    endpoint: `/vault/items/${itemId}`,
    method: 'PUT',
    body: { category, ciphertext },
  });
}

export function useSaveVaultItemMutation() {
  return useMutation({ mutationFn: saveVaultItem });
}

async function deleteVaultItem(itemId: string) {
  return apiRequest({ endpoint: `/vault/items/${itemId}`, method: 'DELETE' });
}

export function useDeleteVaultItemMutation() {
  return useMutation({ mutationFn: deleteVaultItem });
}

async function rekeyVault(payload: VaultRekeyPayload) {
  return apiRequest({ endpoint: '/vault/rekey', method: 'POST', body: payload });
}

export function useRekeyVaultMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rekeyVault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VAULT_META_QUERY_KEY });
    },
  });
}

async function destroyVault() {
  return apiRequest({ endpoint: '/vault', method: 'DELETE' });
}

export function useDestroyVaultMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: destroyVault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VAULT_META_QUERY_KEY });
    },
  });
}
