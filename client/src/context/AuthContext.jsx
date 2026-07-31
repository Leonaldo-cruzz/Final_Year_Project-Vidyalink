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
  const mountedRef                          = useRef(true);

  // ── Session Restore (on mount) ───────────────────────────────
  // Attempt silent token refresh via HTTP-Only cookie.
  // If successful, fetch current user and restore session.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        await authService.refreshToken();
        const currentUser = await authService.getCurrentUser();
        if (mountedRef.current) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch {
        // No valid session — user must log in
        if (mountedRef.current) {
          setUser(null);
          setIsAuthenticated(false);
          clearAccessToken();
        }
      } finally {
        if (mountedRef.current) setLoading(false);
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
      setUser(loggedInUser);
      setIsAuthenticated(true);
      return loggedInUser;
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Login failed';
      setError(message);
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
