"use client";

import { useCallback } from "react";

import { useCurrentUser } from "@/components/providers/user-provider";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export function useApi() {
  const { user } = useCurrentUser();
  const fallbackToken = process.env.NEXT_PUBLIC_API_TOKEN;
  const token = user.token ?? fallbackToken;

  const request = useCallback(
    async <T>(path: string, init?: RequestOptions): Promise<T> => {
      const headers = new Headers(init?.headers ?? {});
      headers.set("Content-Type", "application/json");

      if (!init?.skipAuth) {
        if (!token) {
          throw new Error("API token is missing. Set NEXT_PUBLIC_API_TOKEN or provide a user token.");
        }
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
      });

      if (!response.ok) {
        const text = await response.text();
        const message = text || `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return response.json() as Promise<T>;
    },
    [token]
  );

  const get = useCallback(<T>(path: string) => request<T>(path, { method: "GET" }), [request]);

  const post = useCallback(
    <T>(path: string, body: unknown) =>
      request<T>(path, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    [request]
  );

  const put = useCallback(
    <T>(path: string, body: unknown) =>
      request<T>(path, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    [request]
  );

  const del = useCallback(<T>(path: string) => request<T>(path, { method: "DELETE" }), [request]);

  return {
    baseUrl: API_BASE_URL,
    token,
    get,
    post,
    put,
    del,
  };
}
