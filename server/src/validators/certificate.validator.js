import { z } from 'zod';
import { CERTIFICATE_CATEGORIES } from '../models/certificate.model.js';

const certificateBodySchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must not exceed 200 characters'),
  issuer: z
    .string({ required_error: 'Issuing organization is required' })
    .trim()
    .min(2, 'Issuer must be at least 2 characters')
    .max(200, 'Issuer must not exceed 200 characters'),
  category: z
    .enum(CERTIFICATE_CATEGORIES, {
      errorMap: () => ({ message: `Category must be one of: ${CERTIFICATE_CATEGORIES.join(', ')}` }),
    })
    .default('Other'),
  issueDate: z.string({ required_error: 'Issue date is required' }).refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Issue date must be a valid date' }
  ),
  expiryDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Expiry date must be a valid date',
    }),
  credentialId: z.string().trim().max(100).optional().nullable(),
  credentialUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val === '' || /^https?:\/\/.+/i.test(val),
      { message: 'Credential URL must be a valid HTTP or HTTPS URL' }
    ),
  skills: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (typeof val === 'string') {
        return val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return val.map((s) => String(s).trim()).filter(Boolean);
    }),
});

export const createCertificateSchema = certificateBodySchema;
export const updateCertificateSchema = certificateBodySchema.partial();

export const createCertificateRequestSchema = z.object({
  body: certificateBodySchema,
});

export const updateCertificateRequestSchema = z.object({
  body: certificateBodySchema.partial(),
});

export const certificateListQuerySchema = z.object({
  query: z.object({
    status: z.enum(['All', 'Pending', 'Verified', 'Rejected']).optional(),
    search: z.string().trim().max(200).optional(),
    sort: z.enum(['Oldest', 'Verified First']).optional(),
  }).strict(),
});
