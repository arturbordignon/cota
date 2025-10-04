'use client';

import { useCallback } from 'react';

import { useCurrentUser } from '@/components/providers/user-provider';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function parseError(response: Response) {
  try {
    const data = (await response.clone().json()) as { message?: string };
    if (data?.message) {
      return data.message;
    }
  } catch (err) {
    const text = await response.text();
    if (text) {
      return text;
    }
  }
  return `Request failed with status ${response.status}`;
}

export function useApi() {
  const { accessToken, refreshSession } = useCurrentUser();

  const request = useCallback(
    async <T>(path: string, init?: RequestOptions): Promise<T> => {
      const { skipAuth, ...rest } = init ?? {};

      const buildHeaders = (tokenOverride?: string) => {
        const headers = new Headers(rest.headers ?? {});
        const isFormData = rest.body instanceof FormData;
        if (!isFormData && rest.body && !headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }

        if (!skipAuth) {
          const tokenForRequest = tokenOverride ?? accessToken;
          if (!tokenForRequest) {
            throw new Error('Você precisa se autenticar para continuar.');
          }
          headers.set('Authorization', `Bearer ${tokenForRequest}`);
        }

        return headers;
      };

      const execute = (tokenOverride?: string) =>
        fetch(`${API_BASE_URL}${path}`, {
          ...rest,
          headers: buildHeaders(tokenOverride),
        });

      let response = await execute();

      if (response.status === 401 && !skipAuth) {
        const newToken = await refreshSession().catch(() => null);
        if (newToken) {
          response = await execute(newToken);
        }
      }

      if (!response.ok) {
        const message = await parseError(response);
        throw new Error(message);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return response.json() as Promise<T>;
    },
    [accessToken, refreshSession],
  );

  const get = useCallback(<T>(path: string) => request<T>(path, { method: 'GET' }), [request]);

  const prepareBody = useCallback((body: unknown) => {
    if (body instanceof FormData || body instanceof Blob) return body;
    if (typeof body === 'string') return body;
    if (body == null) return JSON.stringify({});
    return JSON.stringify(body);
  }, []);

  const post = useCallback(
    <T>(path: string, body: unknown, init?: RequestOptions) =>
      request<T>(path, {
        method: 'POST',
        body: prepareBody(body),
        ...init,
      }),
    [request, prepareBody],
  );

  const put = useCallback(
    <T>(path: string, body: unknown) =>
      request<T>(path, {
        method: 'PUT',
        body: prepareBody(body),
      }),
    [request, prepareBody],
  );

  const patch = useCallback(
    <T>(path: string, body: unknown) =>
      request<T>(path, {
        method: 'PATCH',
        body: prepareBody(body),
      }),
    [request, prepareBody],
  );

  const del = useCallback(<T>(path: string) => request<T>(path, { method: 'DELETE' }), [request]);

  return {
    baseUrl: API_BASE_URL,
    accessToken,
    token: accessToken,
    isAuthenticated: Boolean(accessToken),
    get,
    post,
    put,
    patch,
    del,
  };
}
