import { z } from 'zod';

import { PUBLIC_REGISTRATION_ROLES } from '../config/constants.js';

const nullableTrimmedString = (maxLength) => z.string().trim().max(maxLength).nullable().optional();

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    email: z.string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address')
      .toLowerCase(),
    password: z.string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}\[\]|:;"'<>,.?/~`])/, 
        'Password must include uppercase, lowercase, number, and special character'
      ),
    role: z.enum(PUBLIC_REGISTRATION_ROLES, {
      errorMap: () => ({ message: `Role must be one of: ${PUBLIC_REGISTRATION_ROLES.join(', ')}` }),
    }).optional(),
    avatar: z.string().trim().url('Avatar must be a valid URL').nullable().optional(),
    college: nullableTrimmedString(200),
    branch: nullableTrimmedString(200),
    graduationYear: z.coerce.number()
      .int()
      .min(1900, 'Graduation year must be after 1900')
      .max(2100, 'Graduation year must be before 2100')
      .nullable()
      .optional(),
  }).strict(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address')
      .toLowerCase(),
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  }).strict(),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().trim().min(1, 'Refresh token cannot be empty').optional(),
  }).strict().default({}),
});
