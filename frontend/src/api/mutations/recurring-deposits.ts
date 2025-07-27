import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { RecurringDepositPayload } from '../dataInterface';

async function recurringDeposit(data: RecurringDepositPayload) {
  return apiRequest({
    endpoint: '/recurring-deposit/addDeposit',
    method: 'POST',
    body: data,
  });
}

export function useRecurringDepositMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: recurringDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringDeposit-addition'] });
    },
  });

  const cancelRequest = () => {
    queryClient.cancelQueries({ queryKey: ['recurringDeposit-addition'] });
  };

  return {
    ...mutation,
    cancelRequest,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
