import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';

export interface MutualFundInfoPayload {
  date: string;
  sipAmount: number;
  fundName: string;
  platform?: string;
  goal?: string;
  schemeNumber: number;
}

async function addMutualFundInfo(data: MutualFundInfoPayload) {
  return apiRequest({
    endpoint: '/funds/infoAddition',
    method: 'POST',
    body: data,
  });
}

export function useAddMutualFundInfoMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addMutualFundInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mutual-fund-info'] });
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
