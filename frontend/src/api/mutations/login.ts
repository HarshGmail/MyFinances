import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';

interface LoginData {
  email: string;
  password: string;
}

async function login(data: LoginData) {
  return apiRequest({
    endpoint: '/auth/login',
    method: 'POST',
    body: data,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: login,
  });

  const cancelRequest = () => {
    queryClient.cancelQueries();
  };

  return { ...mutation, cancelRequest };
}
