import { z } from 'zod';
import { INDUSTRIES } from '../models/alumniProfile.model.js';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const optionalText = (fieldName, maxLength) =>
  z.string().trim()
    .max(maxLength, `${fieldName} must not exceed ${maxLength} characters`)
    .nullable()
    .optional();

const optionalUrl = (fieldName) =>
  z.string().trim()
    .url(`${fieldName} must be a valid URL`)
    .max(2048, `${fieldName} must not exceed 2048 characters`)
    .refine(
      (v) => v === undefined || v === null || /^https?:\/\//i.test(v),
      `${fieldName} must use HTTP or HTTPS`
    )
    .nullable()
    .optional();

// ─── Alumni profile fields ────────────────────────────────────────────────────

const alumniProfileFields = {
  company: optionalText('Company', 200),
  designation: optionalText('Designation', 150),
  industry: z
    .enum(INDUSTRIES, {
      errorMap: () => ({ message: `Industry must be one of: ${INDUSTRIES.join(', ')}` }),
    })
    .nullable()
    .optional(),
  experienceYears: z.coerce
    .number()
    .min(0, 'Experience years cannot be negative')
    .max(60, 'Experience years cannot exceed 60')
    .nullable()
    .optional(),
  bio: optionalText('Bio', 2000),
  skills: z
    .array(z.string().trim().min(1).max(50))
    .max(50, 'Skills cannot exceed 50 entries')
    .optional(),
  linkedinUrl: optionalUrl('LinkedIn URL'),
  githubUrl: optionalUrl('GitHub URL'),
  companyWebsite: optionalUrl('Company website URL'),
  location: optionalText('Location', 150),
};

// ─── Create alumni profile ─────────────────────────────────────────────────

export const createAlumniProfileSchema = z.object({
  body: z.object(alumniProfileFields).strict(),
});

// ─── Update alumni profile (partial) ─────────────────────────────────────────

export const updateAlumniProfileSchema = z.object({
  body: z
    .object(alumniProfileFields)
    .partial()
    .strict()
    .refine(
      (data) => Object.keys(data).length > 0,
      { message: 'At least one field is required for update' }
    ),
});

// ─── Admin — set verification status ─────────────────────────────────────────

export const setVerificationSchema = z.object({
  params: z.object({
    userId: z.string().min(1, 'User ID is required'),
  }),
  body: z.object({
    isVerified: z.boolean({ required_error: 'isVerified is required' }),
  }),
});
