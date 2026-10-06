"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { AuthUser, LoginResponse } from "@/types/shared";

const TOKEN_KEY = "phishguard_token";
const USER_KEY = "phishguard_user";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((data: LoginResponse) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Determines the dashboard route based on the user's role.
 * - Super Admin → /dashboard/platform
 * - Org Owner / company admin → /dashboard/company
 * - Individual / other → /dashboard
 */
export function getDashboardRoute(user: AuthUser): string {
  const role = user.roleName?.toLowerCase() ?? "";

  if (role === "super admin") {
    return "/dashboard/platform";
  }

  if (user.organizationId && (role === "org owner" || role.includes("admin"))) {
    return "/dashboard/company";
  }

  return "/dashboard";
}
