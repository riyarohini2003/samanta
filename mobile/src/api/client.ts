import { API_BASE_URL } from '../utils/constants';
import { getAccessToken, getRefreshToken, saveTokens, clearAuth } from '../utils/storage';
import { ApiError } from '../types';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: Record<string, unknown>;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string>;
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(`/api/v1${path}`, API_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;

    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const json = await res.json();
    if (json.data?.accessToken && json.data?.refreshToken) {
      await saveTokens(json.data.accessToken, json.data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers: customHeaders } = options;

  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...customHeaders,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = buildUrl(path, query);

  let res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  // Try refresh on 401
  if (res.status === 401 && accessToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = await getAccessToken();
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });
    }
  }

  // Still 401 → force logout
  if (res.status === 401) {
    await clearAuth();
    onUnauthorized?.();
    const err: ApiError = { error: 'Session expired', code: 'UNAUTHORIZED' };
    throw err;
  }

  const json = await res.json();

  if (!res.ok) {
    const err: ApiError = {
      error: json.error || 'Something went wrong',
      code: json.code,
      details: json.details,
    };
    throw err;
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | undefined>) =>
    request<T>('GET', path, { query }),

  post: <T>(path: string, body?: Record<string, unknown>) =>
    request<T>('POST', path, { body }),

  patch: <T>(path: string, body?: Record<string, unknown>) =>
    request<T>('PATCH', path, { body }),

  delete: <T>(path: string) =>
    request<T>('DELETE', path),
};

export default api;
