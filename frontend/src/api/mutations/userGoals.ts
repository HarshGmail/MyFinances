import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../configs';
import { UserGoal } from '../dataInterface';

export type AddGoalPayload = Omit<UserGoal, '_id' | 'userId'> & { targetAmount?: number };
export type UpdateGoalPayload = Partial<Omit<UserGoal, '_id' | 'userId'>> & {
  targetAmount?: number;
};

async function addGoal(data: AddGoalPayload) {
  return apiRequest({
    endpoint: '/goals/add',
    method: 'POST',
    body: data,
  });
}

async function updateGoal(id: string, data: UpdateGoalPayload) {
  return apiRequest({
    endpoint: `/goals/update/${id}`,
    method: 'PUT',
    body: data,
  });
}

async function deleteGoal(id: string) {
  return apiRequest({
    endpoint: `/goals/delete/${id}`,
    method: 'DELETE',
  });
}

export function useAddGoalMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addGoal,
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

export function useUpdateGoalMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalPayload }) => updateGoal(id, data),
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

export function useDeleteGoalMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
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
