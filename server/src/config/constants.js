import { env } from './env.js';

export const UserRoles = Object.freeze({
  STUDENT: 'student',
  FACULTY: 'faculty',
  ALUMNI: 'alumni',
  RECRUITER: 'recruiter',
  ADMIN: 'admin',
});

export const USER_ROLES_LIST = Object.values(UserRoles);

export const PUBLIC_REGISTRATION_ROLES = Object.freeze(
  USER_ROLES_LIST.filter((role) => role !== UserRoles.ADMIN)
);

export const AccountStatus = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
});

export const ACCOUNT_STATUS_LIST = Object.values(AccountStatus);

export const BCRYPT_SALT_ROUNDS = 12;

const refreshTokenLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export const getRefreshTokenCookieOptions = () => {
  const sameSite = env.security.cookieSameSite;
  const secure = env.nodeEnv === 'production' || sameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: refreshTokenLifetimeMs,
    path: `${env.api.prefix}/auth`,
    ...(env.security.cookieDomain && { domain: env.security.cookieDomain }),
  };
};

export const getRefreshTokenClearCookieOptions = () => {
  const { maxAge: _maxAge, ...options } = getRefreshTokenCookieOptions();
  return options;
};
