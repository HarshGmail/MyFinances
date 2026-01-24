import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../configs';

export interface AssetTarget {
  _id: string;
  userId: string;
  asset: 'stock' | 'crypto' | 'mutual-fund' | 'gold';
  targetPrice: number;
  assetId?: string;
  targetDescription?: string;
  assetName: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useUserAssetTargetsQuery() {
  return useQuery<AssetTarget[]>({
    queryKey: ['asset-targets'],
    queryFn: async () => {
      const response = await apiRequest({
        endpoint: '/targets/listUserAssetTargets',
        method: 'GET',
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssetTargetByIdQuery(id?: string) {
  return useQuery<AssetTarget | null>({
    queryKey: ['asset-target', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiRequest({
        endpoint: `/targets/getAssetTargetById/${id}`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssetTargetsByAssetIdQuery(assetId?: string) {
  return useQuery<AssetTarget[]>({
    queryKey: ['asset-targets-by-assetId', assetId],
    queryFn: async () => {
      if (!assetId) return [];
      const response = await apiRequest({
        endpoint: `/targets/getAssetTargetsByAssetId/${assetId}`,
        method: 'GET',
      });
      return response.data || [];
    },
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssetTargetsByAssetQuery(asset?: string) {
  return useQuery<AssetTarget[]>({
    queryKey: ['asset-targets-by-asset', asset],
    queryFn: async () => {
      if (!asset) return [];
      const response = await apiRequest({
        endpoint: `/targets/getAssetTargetsByAsset/${encodeURIComponent(asset)}`,
        method: 'GET',
      });
      return response.data || [];
    },
    enabled: !!asset,
    staleTime: 5 * 60 * 1000,
  });
}
