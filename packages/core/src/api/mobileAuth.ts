import { apiRequest } from './client';
import { User } from '../types';

export interface MobileSession {
  user: User;
  token: string;
  expiresAt: string | null;
}

interface MobileSessionResponse {
  success: boolean;
  data: User;
  token: string;
  expiresAt: string | null;
}

interface MobileRefreshResponse {
  success: boolean;
  token: string | null;
  expiresAt: string | null;
}

function toSession(response: MobileSessionResponse): MobileSession {
  return { user: response.data, token: response.token, expiresAt: response.expiresAt };
}

export async function mobileLogin(credentials: { email: string; password: string }) {
  const response = await apiRequest<MobileSessionResponse>({
    endpoint: '/auth/mobile/login',
    method: 'POST',
    body: credentials,
    skipAuthRedirect: true,
  });
  return toSession(response);
}

export async function mobileSignup(details: { name: string; email: string; password: string }) {
  const response = await apiRequest<MobileSessionResponse>({
    endpoint: '/auth/mobile/signup',
    method: 'POST',
    body: details,
    skipAuthRedirect: true,
  });
  return toSession(response);
}

export async function mobileDemoLogin() {
  const response = await apiRequest<MobileSessionResponse>({
    endpoint: '/auth/mobile/demo-login',
    method: 'POST',
    skipAuthRedirect: true,
  });
  return toSession(response);
}

export async function refreshMobileToken() {
  const response = await apiRequest<MobileRefreshResponse>({
    endpoint: '/auth/mobile/refresh',
    method: 'POST',
    skipAuthRedirect: true,
  });
  return response.token ? { token: response.token, expiresAt: response.expiresAt } : null;
}
