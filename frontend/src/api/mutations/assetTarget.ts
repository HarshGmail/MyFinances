import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';

export interface AssetTargetInput {
  asset: 'stock' | 'crypto' | 'mutual-fund' | 'gold';
  targetPrice: number;
  assetName: string;
  assetId?: string;
  targetDescription?: string;
}

export interface AssetTargetUpdatePayload extends Partial<AssetTargetInput> {
  id: string;
}

async function addAssetTarget(data: AssetTargetInput) {
  return apiRequest({
    endpoint: '/targets/addAssetTarget',
    method: 'POST',
    body: data,
  });
}

export function useAddAssetTargetMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addAssetTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-targets'] });
    },
  });

  const cancelRequest = () => {
    queryClient.cancelQueries();
  };

  return {
    ...mutation,
    cancelRequest,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}

async function updateAssetTarget(data: AssetTargetUpdatePayload) {
  const { id, ...body } = data;
  return apiRequest({
    endpoint: `/targets/updateAssetTargetById/${id}`,
    method: 'PUT',
    body,
  });
}

export function useUpdateAssetTargetMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateAssetTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-targets'] });
    },
  });

  return {
    ...mutation,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}

async function removeAssetTarget(id: string) {
  return apiRequest({
    endpoint: `/targets/removeAssetTarget/${id}`,
    method: 'PUT',
  });
}

export function useRemoveAssetTargetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeAssetTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-targets'] });
    },
  });
}
