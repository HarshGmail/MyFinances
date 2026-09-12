import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { WalletInviteInfo, WalletMemberRecord, WalletSummary } from '@/api/dataInterface';

export const WALLETS_QUERY_KEY = ['wallets'];

export function useWalletsQuery(enabled: boolean) {
  return useQuery<WalletSummary[]>({
    queryKey: WALLETS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/wallets', method: 'GET' });
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 0,
  });
}

export function useWalletMembersQuery(walletId: string | null) {
  return useQuery<WalletMemberRecord[]>({
    queryKey: ['wallet-members', walletId],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: `/wallets/${walletId}/members`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: Boolean(walletId),
    staleTime: 60 * 1000,
    gcTime: 0,
  });
}

export function useWalletInviteInfoQuery(token: string | null) {
  return useQuery<WalletInviteInfo>({
    queryKey: ['wallet-invite', token],
    queryFn: async () => {
      const response = await apiRequest({ endpoint: `/wallets/join/${token}`, method: 'GET' });
      return response.data;
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
}
