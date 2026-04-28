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

// Demo Login

interface DemoLoginResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
    isDemo: boolean;
  };
}

async function demoLogin() {
  return apiRequest<DemoLoginResponse>({
    endpoint: '/auth/demo-login',
    method: 'POST',
  });
}

export function useDemoLoginMutation() {
  return useMutation({
    mutationFn: demoLogin,
  });
}

// Update Ingest Sender Email

async function updateIngestSenderEmail(ingestSenderEmail: string | null) {
  return apiRequest<{ success: boolean; data: { ingestSenderEmail: string | null } }>({
    endpoint: '/auth/ingest-sender-email',
    method: 'PUT',
    body: { ingestSenderEmail },
  });
}

export function useUpdateIngestSenderEmailMutation() {
  return useMutation({
    mutationFn: updateIngestSenderEmail,
  });
}
