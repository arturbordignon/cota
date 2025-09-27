"use client";

import { PropsWithChildren, createContext, useContext, useMemo, useState } from "react";

export type UserRole = "owner" | "admin" | "manager" | "viewer";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
}

interface UserContextValue {
  user: CurrentUser;
  updateUser: (updates: Partial<CurrentUser>) => void;
  isAdmin: boolean;
  isOwner: boolean;
}

const defaultUser: CurrentUser = {
  id: "user-owner",
  name: "Ana Souza",
  email: "ana.souza@servicepro.io",
  role: "owner",
  department: "comercial",
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<CurrentUser>(defaultUser);

  const value = useMemo<UserContextValue>(() => ({
    user,
    updateUser: (updates: Partial<CurrentUser>) => setUser((prev) => ({ ...prev, ...updates })),
    isAdmin: user.role === "admin" || user.role === "owner",
    isOwner: user.role === "owner",
  }), [user]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within a UserProvider");
  }
  return context;
}
