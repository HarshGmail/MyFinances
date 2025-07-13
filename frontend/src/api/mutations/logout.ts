import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';

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
  });

  const cancelRequest = () => {
    queryClient.cancelQueries();
  };

  return { ...mutation, cancelRequest };
}
