import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { EpfAccountPayload } from '../dataInterface';

async function addEpfAccount(data: EpfAccountPayload) {
  return apiRequest({
    endpoint: '/epf/addInfo',
    method: 'POST',
    body: data,
  });
}

export function useAddEpfAccountMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addEpfAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epfAccounts-addition'] });
    },
  });

  const cancelRequest = () => {
    queryClient.cancelQueries({ queryKey: ['epfAccounts-addition'] });
  };

  return {
    ...mutation,
    cancelRequest,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
