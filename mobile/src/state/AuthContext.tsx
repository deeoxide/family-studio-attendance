import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStorage } from '@/lib/tokenStorage';
import { setAuthToken } from '@/api/client';
import { authApi } from '@/api/endpoints';
import type { User } from '@/api/types';

const TOKEN_KEY = 'attendance.token';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStorage.get(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          const { user: me } = await authApi.me();
          setUser(me);
        }
      } catch {
        await tokenStorage.remove(TOKEN_KEY);
        setAuthToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: loggedIn } = await authApi.login(email, password);
    await tokenStorage.set(TOKEN_KEY, token);
    setAuthToken(token);
    setUser(loggedIn);
  };

  const logout = async () => {
    await tokenStorage.remove(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  };

  const refreshMe = async () => {
    const { user: me } = await authApi.me();
    setUser(me);
  };

  const value = useMemo(() => ({ user, loading, login, logout, refreshMe }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
