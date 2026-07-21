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
  SUSPENDED: 'suspended',
});

export const ACCOUNT_STATUS_LIST = Object.values(AccountStatus);

export const BCRYPT_SALT_ROUNDS = 12;

const refreshTokenLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export const getRefreshTokenCookieOptions = () => {
  const sameSite = process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax');
  const secure = process.env.NODE_ENV === 'production' || sameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: refreshTokenLifetimeMs,
    path: `${process.env.API_PREFIX || '/api/v1'}/auth`,
    ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
  };
};

export const getRefreshTokenClearCookieOptions = () => {
  const { maxAge: _maxAge, ...options } = getRefreshTokenCookieOptions();
  return options;
};
