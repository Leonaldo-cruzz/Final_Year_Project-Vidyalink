import { z } from 'zod';

// ─── Reusable Field Definitions ───────────────────────────────────────────────
// Each field is extracted as a named constant so it can be reused across
// multiple schemas (register, update profile, admin create-user, etc.)
// without duplication. (DRY / Single Responsibility)

const fullNameField = z
  .string({ required_error: 'Full name is required' })
  .trim()
  .min(3, 'Full name must be at least 3 characters')
  .max(100, 'Full name must not exceed 100 characters');

const emailField = z
  .string({ required_error: 'Email is required' })
  .trim()
  .email('Please provide a valid email address')
  .toLowerCase();

/**
 * Password field with OWASP-aligned strength rules:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 * - Maximum 128 characters (guards against bcrypt's 72-byte truncation attack)
 */
const passwordField = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
    'Password must contain at least one special character'
  );

/**
 * Public-facing registration role enum.
 * Intentionally excludes "admin" — admin accounts are provisioned internally
 * through a separate privileged channel, never through the public register API.
 */
const registrationRoleField = z
  .enum(['student', 'faculty', 'alumni', 'recruiter'], {
    errorMap: () => ({
      message: 'Role must be one of: student, faculty, alumni, recruiter',
    }),
  })
  .optional()
  .default('student');

// ─── Register Schema ──────────────────────────────────────────────────────────

/**
 * Zod validation schema for POST /api/v1/auth/register.
 *
 * Wraps validated fields under the `body` key to align with the
 * `validate` middleware contract, which parses `{ body, query, params }`
 * and reassigns `req.body = result.data.body` after successful validation.
 */
export const registerSchema = z.object({
  body: z.object({
    fullName: fullNameField,
    email: emailField,
    password: passwordField,
    role: registrationRoleField,

    // Optional profile fields — accepted at registration but not required
    avatar: z
      .string()
      .trim()
      .url('Avatar must be a valid URL')
      .optional(),

    college: z
      .string()
      .trim()
      .max(200, 'College name must not exceed 200 characters')
      .optional(),

    branch: z
      .string()
      .trim()
      .max(100, 'Branch name must not exceed 100 characters')
      .optional(),

    graduationYear: z.coerce
      .number()
      .int('Graduation year must be a whole number')
      .min(1900, 'Graduation year must be after 1900')
      .max(2100, 'Graduation year must be before 2100')
      .optional(),
  }),
});

// ─── Login Schema ─────────────────────────────────────────────────────────────

/**
 * Zod validation schema for POST /api/v1/auth/login.
 *
 * Design decision — password is intentionally a bare required string with NO
 * strength rules here. Applying strength regex at login would:
 *   1. Lock out users whose passwords pre-date the current policy.
 *   2. Leak information about the validation policy to attackers.
 * The model's comparePassword() handles the actual credential check.
 */
export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().trim().min(1, 'Refresh token cannot be empty').optional(),
  }).default({}),
});
