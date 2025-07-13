import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';

interface SignupData {
  name: string;
  email: string;
  password: string;
}

async function signup(data: SignupData) {
  return apiRequest({
    endpoint: '/auth/signup',
    method: 'POST',
    body: data,
  });
}

export function useSignupMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: signup,
  });

  const cancelRequest = () => {
    queryClient.cancelQueries();
  };

  return { ...mutation, cancelRequest };
}
