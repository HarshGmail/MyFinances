import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client';
import { GoalPayload } from '../../types';

async function addGoal(data: GoalPayload) {
  return apiRequest({
    endpoint: '/goals/add',
    method: 'POST',
    body: data,
  });
}

async function updateGoal(id: string, data: GoalPayload) {
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
    mutationFn: ({ id, data }: { id: string; data: GoalPayload }) => updateGoal(id, data),
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
