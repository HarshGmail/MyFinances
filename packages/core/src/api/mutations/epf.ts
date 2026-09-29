import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { EpfAccountPayload, EpfPassbookParseResult, EpfBulkUpdatePayload } from '../../types';

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
      queryClient.invalidateQueries({ queryKey: ['epf-account'] });
      queryClient.invalidateQueries({ queryKey: ['epf-timeline'] });
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

async function parseEpfPassbooks(files: Array<{ data: string; name: string }>) {
  const response = await apiRequest({
    endpoint: '/epf/parse-passbook',
    method: 'POST',
    body: { files },
  });
  return response.data as EpfPassbookParseResult;
}

export function useParseEpfPassbooksMutation() {
  return useMutation({ mutationFn: parseEpfPassbooks });
}

async function bulkUpdateEpfAccounts(payload: EpfBulkUpdatePayload) {
  return apiRequest({ endpoint: '/epf/bulk-update', method: 'POST', body: payload });
}

export function useBulkUpdateEpfAccountsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkUpdateEpfAccounts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epf-account'] });
      queryClient.invalidateQueries({ queryKey: ['epf-timeline'] });
    },
  });
}

function invalidateEpf(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['epf-account'] });
  queryClient.invalidateQueries({ queryKey: ['epf-timeline'] });
}

export function useUpdateEpfAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EpfAccountPayload> }) =>
      apiRequest({ endpoint: `/epf/account/${id}`, method: 'PUT', body: data }),
    onSuccess: () => invalidateEpf(queryClient),
  });
}

export function useDeleteEpfAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest({ endpoint: `/epf/account/${id}`, method: 'DELETE' }),
    onSuccess: () => invalidateEpf(queryClient),
  });
}
