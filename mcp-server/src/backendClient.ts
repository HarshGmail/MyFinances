import axios, { AxiosInstance } from 'axios';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000/api';

export type BackendClient = {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
};

export async function exchangeIngestToken(ingestToken: string): Promise<string> {
  const res = await axios.post<{ success: boolean; token: string }>(
    `${BACKEND_URL}/auth/ingest-token/exchange`,
    { ingestToken },
    { timeout: 10000 }
  );
  if (!res.data.success || !res.data.token) {
    throw new Error('Invalid ingest token');
  }
  return res.data.token;
}

export function createBackendClient(jwt: string): BackendClient {
  const instance: AxiosInstance = axios.create({
    baseURL: BACKEND_URL,
    headers: { Authorization: `Bearer ${jwt}` },
    timeout: 30000,
  });

  return {
    async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
      const res = await instance.get<{ success: boolean; data: T }>(path, { params });
      return res.data.data;
    },
    async post<T>(path: string, body: unknown): Promise<T> {
      const res = await instance.post<{ success: boolean; data: T }>(path, body);
      return res.data.data ?? (res.data as T);
    },
  };
}
