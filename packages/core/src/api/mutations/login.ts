import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { User } from '../../types';

interface LoginData {
  email: string;
  password: string;
}

export function useLoginMutation() {
  const mutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest({
        endpoint: '/auth/login',
        method: 'POST',
        body: data,
        skipAuthRedirect: true,
      });
      return response.data as User;
    },
  });

  const cancelRequest = () => {
    mutation.reset();
  };

  return {
    ...mutation,
    cancelRequest,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
