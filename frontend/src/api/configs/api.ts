/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_BASE_URL } from './baseUrl';

interface ApiFetchOptions extends RequestInit {
  endpoint: string;
  body?: any;
}

export async function apiRequest<T = any>({
  endpoint,
  method = 'GET',
  headers = {},
  body,
  ...rest
}: ApiFetchOptions): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });
  if (!response.ok) {
    let errorObj: any = { message: 'Unknown error', status: response.status };
    try {
      errorObj = await response.json();
    } catch {
      try {
        const text = await response.text();
        errorObj = { message: text, status: response.status };
      } catch {}
    }
    // Handle 401 Unauthorized: remove user from localStorage and reload
    if (response.status === 401) {
      localStorage.removeItem('user');
      window.location.reload();
    }
    throw errorObj;
  }
  return response.json();
}
