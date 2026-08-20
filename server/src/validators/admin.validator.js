import { z } from 'zod';
import { ACCOUNT_STATUS_LIST, USER_ROLES_LIST } from '../config/constants.js';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID');

const optionalString = (maxLength) => z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
  z.string().trim().max(maxLength).optional()
);

const positiveInteger = (defaultValue, max) => z.preprocess(
  (value) => (value === undefined || value === '' ? defaultValue : Number(value)),
  z.number().int().min(1).max(max).default(defaultValue)
);

const optionalDate = z.preprocess(
  (value) => (value === undefined || value === '' ? undefined : new Date(value)),
  z.date({ invalid_type_error: 'Date must be a valid ISO date' }).optional()
);

const optionalEnum = (values) => z.preprocess(
  (value) => (value === undefined || value === '' ? undefined : value),
  z.enum(values).optional()
);

export const listUsersSchema = z.object({
  query: z.object({
    page: positiveInteger(1, 1_000_000),
    limit: positiveInteger(20, 100),
    search: optionalString(100),
    role: optionalEnum(USER_ROLES_LIST),
    status: optionalEnum(ACCOUNT_STATUS_LIST),
    sortBy: z.preprocess(
      (value) => (value === undefined || value === '' ? 'createdAt' : value),
      z.enum(['fullName', 'email', 'role', 'status', 'createdAt', 'updatedAt'])
    ),
    sortOrder: z.preprocess(
      (value) => (value === undefined || value === '' ? 'desc' : value),
      z.enum(['asc', 'desc'])
    ),
  }),
});

export const userIdSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ status: z.enum(ACCOUNT_STATUS_LIST) }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ role: z.enum(USER_ROLES_LIST) }),
});

export const analyticsRangeSchema = z.object({
  query: z.object({
    from: optionalDate,
    to: optionalDate,
  }),
});
