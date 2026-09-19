// ============================================================
// VIDYALINK — AuthContext
// Real API integration with silent refresh on app mount.
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import authService from '@/services/authService';
import { clearAccessToken } from '@/services/api';

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser]                     = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading]               = useState(true); // true while restoring session
  const [error, setError]                   = useState(null);
  // mountedRef guards stale state updates on unmounted components,
  // but MUST NOT gate setLoading(false) — loading must always terminate.
  const mountedRef                          = useRef(true);

  // ── Session Restore (on mount) ───────────────────────────────
  // Attempt silent token refresh via HTTP-Only cookie.
  // If successful, fetch current user and restore session.
  // If 401 / any failure, cleanly mark unauthenticated.
  // CRITICAL: setLoading(false) runs UNCONDITIONALLY in finally —
  // never gated by mountedRef. React 18 StrictMode mounts/unmounts
  // effects twice; mountedRef.current is false on the second run,
  // which would deadlock the loading state if we guarded setLoading.
  useEffect(() => {
    mountedRef.current = true;

    const restoreSession = async () => {
      try {
        await authService.refreshToken();
        const currentUser = await authService.getCurrentUser();
        if (mountedRef.current) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch {
        // No valid session — user must log in.
        // Clear any stale access token in memory.
        if (mountedRef.current) {
          setUser(null);
          setIsAuthenticated(false);
        }
        clearAccessToken();
      } finally {
        // ⚠️ UNCONDITIONAL — must never be gated by mountedRef.
        // A 401 from /refresh-token means "no session", not "keep loading".
        setLoading(false);
      }
    };

    restoreSession();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Login ─────────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    setError(null);
    try {
      const { user: loggedInUser } = await authService.login(credentials);
      if (mountedRef.current) {
        setUser(loggedInUser);
        setIsAuthenticated(true);
        // Explicitly terminate loading in case restoreSession had not yet
        // resolved (e.g., network was slow on first load).
        setLoading(false);
      }
      return loggedInUser;
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Login failed';
      if (mountedRef.current) {
        setError(message);
      }
      throw new Error(message);
    }
  }, []);

  // ── Register ──────────────────────────────────────────────────
  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const result = await authService.register(userData);
      return result;
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      clearAccessToken();
    }
  }, []);

  // ── Refresh User (re-fetch from API) ──────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch {
      // Token may have expired — interceptor will handle redirect
    }
  }, []);

  // ── Context Value ─────────────────────────────────────────────
  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    setError,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
