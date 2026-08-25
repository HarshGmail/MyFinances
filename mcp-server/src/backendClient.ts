import axios, { AxiosInstance } from 'axios';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000/api';
const CREDENTIAL_REVALIDATE_INTERVAL_MS = 15 * 60 * 1000;
const JWT_EXPIRY_MARGIN_MS = 60 * 1000;
const ASSUMED_JWT_LIFETIME_MS = 24 * 60 * 60 * 1000;

export type BackendClient = {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
};

type BackendClientOptions = {
  initialJwt?: string;
  onIngestTokenRejected?: () => void;
};

export class IngestTokenRejectedError extends Error {
  constructor() {
    super('Ingest token is no longer valid — it was regenerated or revoked.');
    this.name = 'IngestTokenRejectedError';
  }
}

export function isIngestTokenRejected(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 403;
}

function isUnauthorized(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

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

function decodeJwtExpiryMs(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number;
    };
    return typeof claims.exp === 'number' ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

function nextRefreshAt(token: string): number {
  const now = Date.now();
  const expiresAt = decodeJwtExpiryMs(token) ?? now + ASSUMED_JWT_LIFETIME_MS;
  return Math.min(now + CREDENTIAL_REVALIDATE_INTERVAL_MS, expiresAt - JWT_EXPIRY_MARGIN_MS);
}

export function createBackendClient(
  ingestToken: string,
  options: BackendClientOptions = {}
): BackendClient {
  const instance: AxiosInstance = axios.create({
    baseURL: BACKEND_URL,
    timeout: 30000,
  });

  let jwt: string | null = options.initialJwt ?? null;
  let refreshAt = options.initialJwt ? nextRefreshAt(options.initialJwt) : 0;
  let inFlightRefresh: Promise<string> | null = null;

  function renewJwt(): Promise<string> {
    if (!inFlightRefresh) {
      inFlightRefresh = exchangeIngestToken(ingestToken)
        .then((renewed) => {
          jwt = renewed;
          refreshAt = nextRefreshAt(renewed);
          return renewed;
        })
        .catch((err) => {
          if (isIngestTokenRejected(err)) {
            jwt = null;
            options.onIngestTokenRejected?.();
            throw new IngestTokenRejectedError();
          }
          throw err;
        })
        .finally(() => {
          inFlightRefresh = null;
        });
    }
    return inFlightRefresh;
  }

  function currentJwt(): Promise<string> {
    if (jwt && Date.now() < refreshAt) return Promise.resolve(jwt);
    return renewJwt();
  }

  async function withFreshAuth<T>(call: (authHeader: string) => Promise<T>): Promise<T> {
    const token = await currentJwt();
    try {
      return await call(`Bearer ${token}`);
    } catch (err) {
      if (!isUnauthorized(err)) throw err;
      const renewed = await renewJwt();
      return call(`Bearer ${renewed}`);
    }
  }

  return {
    async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
      return withFreshAuth(async (Authorization) => {
        const res = await instance.get<{ success: boolean; data: T }>(path, {
          params,
          headers: { Authorization },
        });
        return res.data.data;
      });
    },
    async post<T>(path: string, body: unknown): Promise<T> {
      return withFreshAuth(async (Authorization) => {
        const res = await instance.post<{ success: boolean; data: T }>(path, body, {
          headers: { Authorization },
        });
        return res.data.data ?? (res.data as T);
      });
    },
    async put<T>(path: string, body: unknown): Promise<T> {
      return withFreshAuth(async (Authorization) => {
        const res = await instance.put<{ success: boolean; data: T }>(path, body, {
          headers: { Authorization },
        });
        return res.data.data ?? (res.data as T);
      });
    },
  };
}
