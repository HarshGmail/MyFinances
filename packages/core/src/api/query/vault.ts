import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { VaultMeta } from '../../types';

export const VAULT_META_QUERY_KEY = ['vault-meta'];

export function useVaultMetaQuery() {
  return useQuery<VaultMeta>({
    queryKey: VAULT_META_QUERY_KEY,
    queryFn: async () => {
      const response = await apiRequest({ endpoint: '/vault/meta', method: 'GET' });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 0,
  });
}
