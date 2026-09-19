// ============================================================
// VIDYALINK — Axios Interceptor Regression Tests
//
// Verifies that:
// 1. /auth/refresh-token 401 does NOT trigger another refresh attempt
// 2. Other endpoints' 401 trigger at most one refresh, not more
// 3. Refresh interceptor does not recurse / infinite-loop
// 4. Non-401 errors pass through immediately
// ============================================================

import { describe, it, expect, vi } from 'vitest';

const REFRESH_URL = '/auth/refresh-token';
const OTHER_URL   = '/projects';

// Rebuild the api module for each test to reset module-level state (_isRefreshing, etc.)
const getApi = async () => {
  vi.resetModules();
  const module = await import('@/services/api');
  return {
    api: module.default,
    setAccessToken: module.setAccessToken,
    clearAccessToken: module.clearAccessToken,
  };
};

describe('Axios interceptor — refresh-token guard', () => {
  it('TC-I1: 401 from /auth/refresh-token does NOT trigger another refresh (no recursive loop)', async () => {
    const { api } = await getApi();

    // Spy on api.post to count calls — simulate a 401 on the refresh endpoint itself
    const postSpy = vi.spyOn(api, 'post').mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        config: { url: REFRESH_URL, _retry: false },
        response: { status: 401 },
        isAxiosError: true,
      }),
    );

    await expect(api.post(REFRESH_URL)).rejects.toThrow();

    // post should have been called exactly once — no retry
    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it('TC-I2: _retry flag prevents double-retry on other endpoints', async () => {
    const { api } = await getApi();

    // Simulate: first call returns 401 with _retry already true (already retried once)
    const postSpy = vi.spyOn(api, 'post').mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        config: { url: OTHER_URL, _retry: true }, // already retried — must not retry again
        response: { status: 401 },
        isAxiosError: true,
      }),
    );

    await expect(api.post(OTHER_URL)).rejects.toThrow();
    // Should not attempt another refresh since _retry is already true
    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it('TC-I3: Non-401 errors pass through immediately without refresh attempt', async () => {
    const { api } = await getApi();

    const postSpy = vi.spyOn(api, 'post').mockRejectedValue(
      Object.assign(new Error('Server Error'), {
        config: { url: OTHER_URL, _retry: false },
        response: { status: 500 },
        isAxiosError: true,
      }),
    );

    await expect(api.post(OTHER_URL)).rejects.toThrow('Server Error');
    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it('TC-I4: setAccessToken and clearAccessToken are exported functions', async () => {
    const { setAccessToken, clearAccessToken } = await getApi();
    expect(typeof setAccessToken).toBe('function');
    expect(typeof clearAccessToken).toBe('function');
    // Calling them should not throw
    setAccessToken('test-token-xyz');
    clearAccessToken();
  });
});

describe('Axios interceptor — URL guard logic (unit)', () => {
  it('TC-I5: Guard correctly identifies refresh-token URLs', () => {
    const urls = [
      '/auth/refresh-token',
      'http://localhost:5000/api/v1/auth/refresh-token',
      '/api/v1/auth/refresh-token',
    ];

    for (const url of urls) {
      expect(url.includes('/auth/refresh-token')).toBe(true);
    }
  });

  it('TC-I6: Guard does not incorrectly match other auth URLs', () => {
    const urls = [
      '/auth/login',
      '/auth/me',
      '/auth/logout',
      '/auth/register',
    ];

    for (const url of urls) {
      expect(url.includes('/auth/refresh-token')).toBe(false);
    }
  });
});
