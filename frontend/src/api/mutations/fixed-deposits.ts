import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { FixedDepositPayload } from '../dataInterface';

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
      queryClient.invalidateQueries({ queryKey: ['fixedDeposit-addition'] });
    },
  });

  const cancelRequest = () => {
    queryClient.cancelQueries({ queryKey: ['fixedDeposit-addition'] });
  };

  return {
    ...mutation,
    cancelRequest,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
