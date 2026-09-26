import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { FixedDepositPayload } from '../../types';

async function fixedDeposit(data: FixedDepositPayload) {
  return apiRequest({
    endpoint: '/fixed-deposit/addDeposit',
    method: 'POST',
    body: data,
  });
}

export function useFixedDepositMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: fixedDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-deposits-fetch'] });
    },
  });

  const cancelRequest = () => {
    queryClient.cancelQueries({ queryKey: ['fixed-deposits-fetch'] });
  };

  return {
    ...mutation,
    cancelRequest,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
