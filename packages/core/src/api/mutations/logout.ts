import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, notifyLoggedOut } from '../client';

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
      await notifyLoggedOut();
      queryClient.clear();
    },
  });

  const cancelRequest = () => {
    queryClient.cancelQueries();
  };

  return { ...mutation, cancelRequest };
}
