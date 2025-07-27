import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserProfile } from '../dataInterface';
import { apiRequest } from '../configs';

export type UpdateUserProfile = Partial<UserProfile>;

async function updateUserProfile(data: UpdateUserProfile) {
  return apiRequest({
    endpoint: `/auth/profile`,
    method: 'PUT',
    body: data,
  });
}

export function useUpdateUserProfileMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ data }: { data: UpdateUserProfile }) => updateUserProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals'] });
    },
  });
  return {
    ...mutation,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
