import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Role } from '../types';
import { authApi, setOnUnauthorized } from '../api';
import { saveTokens, saveUser, getSavedUser, clearAuth } from '../utils/storage';
import { ADMIN_ROLES, MANAGEMENT_ROLES } from '../utils/constants';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isManagement: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const setUser = useCallback((user: User | null) => {
    setState({
      user,
      isLoading: false,
      isAuthenticated: !!user,
    });
  }, []);

  // Check saved session on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await getSavedUser();
        if (saved) {
          // Verify session is still valid
          const user = await authApi.me();
          setUser(user);
          await saveUser(user);
        } else {
          setUser(null);
        }
      } catch {
        await clearAuth();
        setUser(null);
      }
    })();
  }, [setUser]);

  // Register global unauthorized handler
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
    });
  }, [setUser]);

  const login = useCallback(async (loginId: string, password: string) => {
    const result = await authApi.login(loginId, password);
    const user = result.user;
    await saveUser(user);
    // If the server returns tokens in response body (for mobile), store them
    const r = result as unknown as Record<string, unknown>;
    if (r.accessToken && r.refreshToken) {
      await saveTokens(r.accessToken as string, r.refreshToken as string);
    }
    setUser(user);
  }, [setUser]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors during logout
    }
    await clearAuth();
    setUser(null);
  }, [setUser]);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.me();
      setUser(user);
      await saveUser(user);
    } catch {
      await clearAuth();
      setUser(null);
    }
  }, [setUser]);

  const role = state.user?.role;
  const isAdmin = !!role && (ADMIN_ROLES as readonly string[]).includes(role);
  const isManagement = !!role && (MANAGEMENT_ROLES as readonly string[]).includes(role);
  const isEmployee = role === 'EMPLOYEE';

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshUser,
        isAdmin,
        isManagement,
        isEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
