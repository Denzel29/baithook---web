"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { ApiError, apiRequest, SESSION_EXPIRED_EVENT } from "@/lib/api";
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

  // The stored user can be stale: an admin may have changed this person's role
  // or moved them into an organization since they logged in. Refresh it once
  // per session so routing and role checks use current data.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiRequest<AuthUser>("/auth/me", { token })
      .then((fresh) => {
        if (cancelled) return;
        setUser(fresh);
        localStorage.setItem(USER_KEY, JSON.stringify(fresh));
      })
      .catch((error) => {
        // 401 is handled by the session-expired listener; a 403 here means the
        // account or organization was suspended
        if (!cancelled && error instanceof ApiError && error.status === 403) {
          toast.error(error.message);
          logout();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  // Any request rejected as unauthenticated ends the local session; dashboard
  // guards then send the user to /login
  useEffect(() => {
    const onExpired = () => {
      if (!localStorage.getItem(TOKEN_KEY)) return;
      toast.error("Your session has ended. Please log in again.");
      logout();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [logout]);

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
