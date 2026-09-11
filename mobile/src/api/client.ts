import { API_URL } from './config';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => ({})) : undefined;
  if (!res.ok) {
    throw new ApiError(res.status, (body && (body as any).error) || res.statusText || 'Request failed');
  }
  return body as T;
}

/** Fetch a non-JSON response (e.g. a CSV export) as plain text. */
async function requestText(path: string): Promise<string> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as any).error || res.statusText || 'Request failed');
  }
  return res.text();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  getText: (path: string) => requestText(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
};
