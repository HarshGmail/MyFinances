'use client';

import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/api/configs/api';

// Change Password

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

async function changePassword(data: ChangePasswordPayload) {
  return apiRequest<{ success: boolean; message: string }>({
    endpoint: '/auth/change-password',
    method: 'POST',
    body: data,
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: changePassword,
  });
}

// Forgot Password

interface ForgotPasswordPayload {
  email: string;
}

async function forgotPassword(data: ForgotPasswordPayload) {
  return apiRequest<{ success: boolean; message: string }>({
    endpoint: '/auth/forgot-password',
    method: 'POST',
    body: data,
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: forgotPassword,
  });
}

// Reset Password

interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

async function resetPassword(data: ResetPasswordPayload) {
  return apiRequest<{ success: boolean; message: string }>({
    endpoint: '/auth/reset-password',
    method: 'POST',
    body: data,
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: resetPassword,
  });
}
