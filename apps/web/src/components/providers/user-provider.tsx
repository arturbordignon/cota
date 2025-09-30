"use client";

import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import * as authClient from "@/lib/auth-client";

export type UserRole = "owner" | "admin" | "manager" | "viewer" | "member";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  locale?: string | null;
  account: {
    id: string;
    name: string;
    slug: string;
    locale: string;
  };
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface UserContextValue {
  user: CurrentUser | null;
  status: AuthStatus;
  accessToken: string | null;
  token: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  signIn: (payload: authClient.LoginPayload) => Promise<void>;
  signUp: (payload: authClient.RegisterPayload) => Promise<void>;
  signOut: (options?: { redirect?: boolean }) => void;
  refreshSession: () => Promise<string>;
  updateUser: (updates: Partial<CurrentUser>) => void;
}

const ACCESS_TOKEN_KEY = "crane.accessToken";
const REFRESH_TOKEN_KEY = "crane.refreshToken";
const ACCOUNT_SLUG_KEY = "crane.accountSlug";

const UserContext = createContext<UserContextValue | undefined>(undefined);

function normalizeRole(role: string | null | undefined): UserRole {
  const value = role?.toLowerCase() ?? "member";
  switch (value) {
    case "owner":
      return "owner";
    case "admin":
      return "admin";
    case "manager":
      return "manager";
    case "viewer":
      return "viewer";
    default:
      return "member";
  }
}

function mapProfileToUser(profile: authClient.ProfileResponse): CurrentUser {
  return {
    id: profile.user.id,
    name: profile.user.name,
    email: profile.user.email,
    role: normalizeRole(profile.user.role),
    locale: profile.user.locale ?? profile.account.locale,
    department: profile.user.department?.name ?? null,
    account: {
      id: profile.account.id,
      name: profile.account.name,
      slug: profile.account.slug,
      locale: profile.account.locale,
    },
  };
}

function persistItem(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  if (value == null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
}

function readItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export function UserProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const refreshPromiseRef = useRef<Promise<string> | null>(null);

  const saveTokens = useCallback((tokens: authClient.TokensResponse) => {
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    persistItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    persistItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }, []);

  const loadProfile = useCallback(
    async (token: string) => {
      const profile = await authClient.me(token);
      const mapped = mapProfileToUser(profile);
      setUser(mapped);
      setStatus("authenticated");
      setAccessToken(token);
      return mapped;
    },
    []
  );

  const signOut = useCallback(
    (options?: { redirect?: boolean }) => {
      setUser(null);
      setStatus("unauthenticated");
      setAccessToken(null);
      setRefreshToken(null);
      persistItem(ACCESS_TOKEN_KEY, null);
      persistItem(REFRESH_TOKEN_KEY, null);
      if (options?.redirect !== false) {
        router.replace("/sign-in");
      }
      queryClient.clear();
    },
    [queryClient, router]
  );

  const refreshSession = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    if (!refreshToken) {
      signOut({ redirect: false });
      return Promise.reject(new Error("Refresh token not available"));
    }

    refreshPromiseRef.current = authClient
      .refresh(refreshToken)
      .then(async ({ tokens }) => {
        saveTokens(tokens);
        await loadProfile(tokens.accessToken);
        return tokens.accessToken;
      })
      .catch((error) => {
        signOut({ redirect: false });
        throw error;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    return refreshPromiseRef.current;
  }, [refreshToken, loadProfile, saveTokens, signOut]);

  const signIn = useCallback(
    async (payload: authClient.LoginPayload) => {
      setStatus("loading");
      try {
        const result = await authClient.login(payload);
        saveTokens(result.tokens);
        persistItem(ACCOUNT_SLUG_KEY, payload.accountSlug);
        await loadProfile(result.tokens.accessToken);
      } catch (error) {
        setStatus(accessToken ? "authenticated" : "unauthenticated");
        throw error;
      }
    },
    [loadProfile, saveTokens, accessToken]
  );

  const signUp = useCallback(
    async ({ locale = "pt-BR", ...payload }: authClient.RegisterPayload) => {
      setStatus("loading");
      try {
        const result = await authClient.register({ ...payload, locale });
        saveTokens(result.tokens);
        persistItem(ACCOUNT_SLUG_KEY, result.account.slug);
        await loadProfile(result.tokens.accessToken);
      } catch (error) {
        setStatus(accessToken ? "authenticated" : "unauthenticated");
        throw error;
      }
    },
    [loadProfile, saveTokens, accessToken]
  );

  const updateUser = useCallback((updates: Partial<CurrentUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  // Bootstrap session from storage or development token
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedAccess = readItem(ACCESS_TOKEN_KEY);
    const storedRefresh = readItem(REFRESH_TOKEN_KEY);

    if (storedRefresh) {
      setRefreshToken(storedRefresh);
    }

    const fallbackToken = process.env.NEXT_PUBLIC_API_TOKEN ?? null;

    const tokenToUse = storedAccess ?? fallbackToken;

    if (!tokenToUse) {
      setStatus("unauthenticated");
      return;
    }

    setAccessToken(tokenToUse);
    loadProfile(tokenToUse).catch(async () => {
      if (!storedRefresh) {
        setStatus("unauthenticated");
        signOut({ redirect: false });
        return;
      }

      try {
        await refreshSession();
      } catch {
        setStatus("unauthenticated");
      }
    });
  }, [loadProfile, refreshSession, signOut]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      status,
      accessToken,
      token: accessToken,
      isOwner: user?.role === "owner",
      isAdmin: user?.role === "owner" || user?.role === "admin",
      signIn,
      signUp,
      signOut,
      refreshSession,
      updateUser,
    }),
    [user, status, accessToken, signIn, signUp, signOut, refreshSession, updateUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within a UserProvider");
  }
  return context;
}
