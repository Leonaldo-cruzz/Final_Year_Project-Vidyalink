// ============================================================
// VIDYALINK — AuthContext Regression Tests
//
// Covers the auth lifecycle regressions documented in the
// "Verifying Session..." infinite loading bug fix.
//
// Test matrix:
// 1. restoreSession: 401 from refresh-token → loading = false (no deadlock)
// 2. restoreSession: success → loading = false, user is set
// 3. login: success → isAuthenticated = true, loading = false
// 4. login: failure → error is set, isAuthenticated = false
// 5. logout: clears user and isAuthenticated
// 6. Expired/invalid session: user returned to unauthenticated state cleanly
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// ── Mock authService ─────────────────────────────────────────
vi.mock('@/services/authService', () => ({
  default: {
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  },
}));

// ── Mock api clearAccessToken ────────────────────────────────
vi.mock('@/services/api', () => ({
  clearAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
  default: {},
}));

import authService from '@/services/authService';
import { clearAccessToken } from '@/services/api';

// ── Helper: Render a component that consumes AuthContext ─────
const AuthConsumer = ({ onRender }) => {
  const auth = useAuth();
  onRender(auth);
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user">{auth.user ? auth.user.email : 'null'}</span>
      <span data-testid="error">{auth.error || 'null'}</span>
    </div>
  );
};

const renderWithAuth = (onRender = () => {}) =>
  render(
    <AuthProvider>
      <AuthConsumer onRender={onRender} />
    </AuthProvider>,
  );

// ── Tests ─────────────────────────────────────────────────────
describe('AuthContext — restoreSession on app mount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-1: 401 from refresh-token → loading becomes false (no infinite deadlock)', async () => {
    // Simulate no valid refresh token: server returns 401
    authService.refreshToken.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { response: { status: 401 } }),
    );

    renderWithAuth();

    // Initially loading is true
    expect(screen.getByTestId('loading').textContent).toBe('true');

    // After restoreSession completes (with 401), loading MUST become false
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(clearAccessToken).toHaveBeenCalled();
  });

  it('TC-2: Successful session restore → user is authenticated, loading is false', async () => {
    const mockUser = { _id: 'u1', email: 'student@vidyalink.edu', role: 'student' };
    authService.refreshToken.mockResolvedValue('new-access-token');
    authService.getCurrentUser.mockResolvedValue(mockUser);

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('student@vidyalink.edu');
  });

  it('TC-3: getCurrentUser failing after successful refresh → unauthenticated, loading false', async () => {
    authService.refreshToken.mockResolvedValue('new-access-token');
    authService.getCurrentUser.mockRejectedValue(new Error('User not found'));

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('TC-4: Network error during refresh → loading false (not infinite)', async () => {
    authService.refreshToken.mockRejectedValue(new Error('Network Error'));

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });
});

describe('AuthContext — login flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pre-resolve restoreSession to get past init loading
    authService.refreshToken.mockRejectedValue(new Error('No refresh token'));
  });

  it('TC-5: Successful login → isAuthenticated true, loading false, user set', async () => {
    const mockUser = { _id: 'u2', email: 'faculty@vidyalink.edu', role: 'faculty' };
    authService.login.mockResolvedValue({ accessToken: 'at', user: mockUser });

    let authContext;
    renderWithAuth((ctx) => { authContext = ctx; });

    // Wait for restoreSession to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Perform login
    await act(async () => {
      await authContext.login({ email: 'faculty@vidyalink.edu', password: 'Password123!' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('faculty@vidyalink.edu');
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('TC-6: Failed login → error set, isAuthenticated remains false', async () => {
    authService.login.mockRejectedValue(
      Object.assign(new Error('Invalid email or password'), {
        response: { data: { message: 'Invalid email or password' } },
      }),
    );

    let authContext;
    renderWithAuth((ctx) => { authContext = ctx; });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await expect(
      act(async () => {
        await authContext.login({ email: 'wrong@test.com', password: 'bad' });
      }),
    ).rejects.toThrow('Invalid email or password');

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });
});

describe('AuthContext — logout flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-7: Logout clears user and authentication state', async () => {
    const mockUser = { _id: 'u3', email: 'admin@vidyalink.edu', role: 'admin' };
    authService.refreshToken.mockResolvedValue('at');
    authService.getCurrentUser.mockResolvedValue(mockUser);
    authService.logout.mockResolvedValue(undefined);

    let authContext;
    renderWithAuth((ctx) => { authContext = ctx; });

    // Wait for session restore
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    // Logout
    await act(async () => {
      await authContext.logout();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
    expect(clearAccessToken).toHaveBeenCalled();
  });

  it('TC-8: Logout clears state even if server call fails', async () => {
    authService.refreshToken.mockRejectedValue(new Error('No session'));
    authService.logout.mockRejectedValue(new Error('Server error'));

    let authContext;
    renderWithAuth((ctx) => { authContext = ctx; });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // logout() uses try/finally — the server error still propagates, but state
    // is always cleared. Consume the thrown error so the test doesn't fail on it.
    await act(async () => {
      try {
        await authContext.logout();
      } catch {
        // Expected — server returned error; state should still be cleared
      }
    });

    // State MUST be cleared regardless of the server error
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });
});

describe('AuthContext — session expiry scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-9: Expired refresh token (TokenExpiredError from backend) → unauthenticated, loading false', async () => {
    authService.refreshToken.mockRejectedValue(
      Object.assign(new Error('Refresh token has expired'), {
        response: { status: 401, data: { message: 'Refresh token has expired' } },
      }),
    );

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(clearAccessToken).toHaveBeenCalled();
  });

  it('TC-10: Invalid refresh token → unauthenticated, loading false, no infinite loop', async () => {
    authService.refreshToken.mockRejectedValue(
      Object.assign(new Error('Invalid refresh token'), {
        response: { status: 401, data: { message: 'Invalid refresh token' } },
      }),
    );

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    // refreshToken must NOT have been called more than once (no retry loop)
    expect(authService.refreshToken).toHaveBeenCalledTimes(1);
  });
});
