'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { can, canAny, type Permission, type Role } from '@/lib/roles';
import { clearApiCache } from '@/lib/useApi';

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  company?: string;
  /**
   * What this role can actually reach right now, sent by /api/auth/me. Absent
   * only on a session created before the field existed, in which case the
   * compiled-in defaults are used instead.
   */
  permissions?: Permission[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  company?: string;
  phone?: string;
  country?: string;
  city?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * The last confirmed session, so the admin shell paints immediately instead of
 * holding a blank spinner until /api/auth/me answers — which on a sleeping
 * server is half a minute. It only decides what is drawn: every API call is
 * still checked on the server, and a refused session clears it at once.
 */
const SESSION_KEY = 'kcc-session-user';

function rememberUser(user: User | null) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode: it simply stays slower */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        rememberUser(data.user);
      } else if (res.status === 401 || res.status === 403) {
        setUser(null);
        rememberUser(null);
        clearApiCache();
      }
      // Any other failure says the server is struggling, not that the person
      // has been signed out, so whoever is on screen stays there.
    } catch {
      /* offline, same as above */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
        setLoading(false);
      }
    } catch {
      /* a corrupt entry falls through to the real check */
    }
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refreshUser();
    }, 5 * 60 * 1000);

    const onFocus = () => refreshUser();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshUser();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        clearApiCache();
        setUser(data.user);
        rememberUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        clearApiCache();
        setUser(result.user);
        rememberUser(result.user);
        return { success: true };
      }
      return { success: false, error: result.error || 'Registration failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    rememberUser(null);
    clearApiCache();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

/**
 * Permission check bound to the signed-in user.
 * Client-side gating is for UX only — every API route re-checks server-side.
 */
export function usePermission() {
  const { user } = useAuth();
  return {
    role: user?.role,
    // The list the server sent for this session wins; the compiled-in defaults
    // are only a fallback for a session that predates this field.
    can: (p: Permission) =>
      Array.isArray(user?.permissions) ? user.permissions.includes(p) : can(user?.role, p),
    canAny: (ps: Permission[]) => canAny(user?.role, ps),
  };
}
