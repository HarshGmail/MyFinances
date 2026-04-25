import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { clearQueryCache } from '@/lib/queryPersister';

async function logout() {
  return apiRequest({
    endpoint: '/auth/logout',
    method: 'POST',
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await clearQueryCache();
      queryClient.clear();
    },
  });

  const cancelRequest = () => {
    queryClient.cancelQueries();
  };

  return { ...mutation, cancelRequest };
}
