export interface ApiError {
  message: string;
  status: number;
  [key: string]: unknown;
}

export interface ApiClientConfig {
  baseUrl: string;
  credentials?: RequestCredentials;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  onDemoBlocked?: () => void;
  onLoggedOut?: () => Promise<void> | void;
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  endpoint: string;
  body?: unknown;
  skipAuthRedirect?: boolean;
}

const DEMO_READ_ONLY_MESSAGE = 'Demo data is read-only';
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;

let clientConfig: ApiClientConfig | null = null;

export function configureApi(config: ApiClientConfig): void {
  clientConfig = config;
}

function requireConfig(): ApiClientConfig {
  if (!clientConfig) throw new Error('configureApi() must be called before making API requests');
  return clientConfig;
}

export function getApiBaseUrl(): string {
  return requireConfig().baseUrl;
}

export async function notifyLoggedOut(): Promise<void> {
  await requireConfig().onLoggedOut?.();
}

async function readError(response: Response): Promise<ApiError> {
  let parsed: Record<string, unknown> = { message: 'Unknown error' };
  try {
    parsed = await response.json();
  } catch {
    try {
      parsed = { message: await response.text() };
    } catch {
      parsed = { message: 'Unknown error' };
    }
  }
  return { ...parsed, message: String(parsed.message ?? 'Unknown error'), status: response.status };
}

export async function apiRequest<T = any>({
  endpoint,
  method = 'GET',
  headers = {},
  body,
  skipAuthRedirect = false,
  ...rest
}: ApiFetchOptions): Promise<T> {
  const config = requireConfig();
  const token = config.getToken?.() ?? null;
  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    credentials: config.credentials,
    body: body === undefined ? undefined : JSON.stringify(body),
    ...rest,
  });

  if (!response.ok) {
    const error = await readError(response);
    if (error.status === HTTP_FORBIDDEN && error.message === DEMO_READ_ONLY_MESSAGE) {
      config.onDemoBlocked?.();
    }
    if (error.status === HTTP_UNAUTHORIZED && !skipAuthRedirect) {
      config.onUnauthorized?.();
    }
    throw error;
  }
  return response.json();
}
