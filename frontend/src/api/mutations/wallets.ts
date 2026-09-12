import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { WALLETS_QUERY_KEY } from '../query/wallets';
import {
  VaultKeyPairPayload,
  WalletCreatePayload,
  WalletDetailResponse,
  WalletInviteResponse,
  WalletItemPayload,
  WalletRotatePayload,
  WrappedWalletKey,
} from '@/api/dataInterface';

export async function fetchWalletDetail(walletId: string): Promise<WalletDetailResponse> {
  const response = await apiRequest({ endpoint: `/wallets/${walletId}/items`, method: 'GET' });
  return response.data;
}

export async function fetchUserPublicKey(userId: string): Promise<JsonWebKey> {
  const response = await apiRequest({ endpoint: `/vault/public-key/${userId}`, method: 'GET' });
  return response.data.publicKey;
}

async function saveVaultKeyPair(payload: VaultKeyPairPayload) {
  return apiRequest({ endpoint: '/vault/keypair', method: 'POST', body: payload });
}

export function useSaveVaultKeyPairMutation() {
  return useMutation({ mutationFn: saveVaultKeyPair });
}

async function createWallet(payload: WalletCreatePayload): Promise<{ id: string }> {
  const response = await apiRequest({ endpoint: '/wallets', method: 'POST', body: payload });
  return { id: response.id };
}

export function useCreateWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
    },
  });
}

async function deleteWallet(walletId: string) {
  return apiRequest({ endpoint: `/wallets/${walletId}`, method: 'DELETE' });
}

export function useDeleteWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
    },
  });
}

async function saveWalletItem({
  walletId,
  itemId,
  category,
  ciphertext,
  sourceItemId,
}: WalletItemPayload) {
  return apiRequest({
    endpoint: `/wallets/${walletId}/items/${itemId}`,
    method: 'PUT',
    body: { category, ciphertext, sourceItemId: sourceItemId ?? null },
  });
}

export function useSaveWalletItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveWalletItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
    },
  });
}

async function deleteWalletItem({ walletId, itemId }: { walletId: string; itemId: string }) {
  return apiRequest({ endpoint: `/wallets/${walletId}/items/${itemId}`, method: 'DELETE' });
}

export function useDeleteWalletItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWalletItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
    },
  });
}

async function createWalletInvite({
  walletId,
  expiresInDays,
  maxUses,
}: {
  walletId: string;
  expiresInDays: number;
  maxUses: number;
}): Promise<WalletInviteResponse> {
  const response = await apiRequest({
    endpoint: `/wallets/${walletId}/invites`,
    method: 'POST',
    body: { expiresInDays, maxUses },
  });
  return response.data;
}

export function useCreateWalletInviteMutation() {
  return useMutation({ mutationFn: createWalletInvite });
}

async function approveWalletMember({ walletId, userId }: { walletId: string; userId: string }) {
  return apiRequest({
    endpoint: `/wallets/${walletId}/members/${userId}/approve`,
    method: 'POST',
  });
}

export function useApproveWalletMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveWalletMember,
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['wallet-members', variables.walletId] });
    },
  });
}

async function removeWalletMember({ walletId, userId }: { walletId: string; userId: string }) {
  return apiRequest({ endpoint: `/wallets/${walletId}/members/${userId}`, method: 'DELETE' });
}

export function useRemoveWalletMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeWalletMember,
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['wallet-members', variables.walletId] });
    },
  });
}

async function rotateWalletKey({ walletId, ...payload }: WalletRotatePayload) {
  return apiRequest({ endpoint: `/wallets/${walletId}/rotate`, method: 'POST', body: payload });
}

export function useRotateWalletKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rotateWalletKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
    },
  });
}

async function joinWallet({
  token,
  wrappedWalletKey,
}: {
  token: string;
  wrappedWalletKey: WrappedWalletKey;
}): Promise<{ status: string; walletId: string }> {
  const response = await apiRequest({
    endpoint: `/wallets/join/${token}`,
    method: 'POST',
    body: { wrappedWalletKey },
  });
  return response.data;
}

export function useJoinWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
    },
  });
}
