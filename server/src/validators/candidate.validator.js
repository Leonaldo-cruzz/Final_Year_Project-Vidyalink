import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = (fieldName = 'ID') =>
  z
    .string({ required_error: `${fieldName} is required` })
    .trim()
    .regex(OBJECT_ID_REGEX, `Invalid ${fieldName} format (must be a 24-character hexadecimal ObjectId)`);

const scoreQuery = (label) => z
  .string()
  .optional()
  .transform((val) => (val ? Number.parseFloat(val) : undefined))
  .refine((n) => n === undefined || (!Number.isNaN(n) && n >= 0 && n <= 100), {
    message: `${label} must be a number between 0 and 100`,
  });

export const candidateSearchSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : 1))
      .refine((n) => Number.isInteger(n) && n >= 1, {
        message: 'Page must be an integer greater than or equal to 1',
      }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : 20))
      .refine((n) => Number.isInteger(n) && n >= 1 && n <= 100, {
        message: 'Limit must be an integer between 1 and 100',
      }),
    search: z.string().trim().max(200, 'Search query must not exceed 200 characters').optional(),
    skills: z.string().trim().max(500, 'Skills query must not exceed 500 characters').optional(),
    requiredSkills: z.string().trim().max(500, 'Required skills query must not exceed 500 characters').optional(),
    branch: z.string().trim().max(100, 'Branch must not exceed 100 characters').optional(),
    graduationYear: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : undefined))
      .refine((n) => n === undefined || (Number.isInteger(n) && n >= 1900 && n <= 2100), {
        message: 'Graduation year must be a valid 4-digit year between 1900 and 2100',
      }),
    domain: z.string().trim().max(100, 'Domain must not exceed 100 characters').optional(),
    college: z.string().trim().max(200, 'College must not exceed 200 characters').optional(),
    verificationStatus: z
      .string()
      .trim()
      .max(50)
      .optional(),
    minPortfolioScore: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseFloat(val) : undefined))
      .refine((n) => n === undefined || (!Number.isNaN(n) && n >= 0 && n <= 100), {
        message: 'Minimum portfolio score must be a number between 0 and 100',
      }),
    maxPortfolioScore: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseFloat(val) : undefined))
      .refine((n) => n === undefined || (!Number.isNaN(n) && n >= 0 && n <= 100), {
        message: 'Maximum portfolio score must be a number between 0 and 100',
      }),
    minIndustryReadiness: scoreQuery('Minimum industry readiness'),
    maxIndustryReadiness: scoreQuery('Maximum industry readiness'),
    minATSScore: scoreQuery('Minimum ATS score'),
    maxATSScore: scoreQuery('Maximum ATS score'),
    verifiedOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
    sortBy: z
      .enum([
        'industryReadiness',
        'portfolioScore',
        'atsScore',
        'updatedAt',
        'name',
        'createdAt',
        'graduationYear',
        'relevance',
        'recentlyUpdated',
      ])
      .optional()
      .default('industryReadiness'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export const candidateDetailsSchema = z.object({
  params: z.object({
    studentId: objectIdSchema('Student ID'),
  }),
});

export const candidateCompareSchema = z.object({
  query: z.object({
    ids: z
      .string()
      .trim()
      .min(1, 'At least two candidate IDs are required')
      .transform((value) => [...new Set(value.split(',').map((id) => id.trim()).filter(Boolean))])
      .refine((ids) => ids.length >= 2, 'At least two candidate IDs are required')
      .refine((ids) => ids.length <= 5, 'A maximum of five candidates can be compared')
      .refine((ids) => ids.every((id) => OBJECT_ID_REGEX.test(id)), 'All candidate IDs must be valid ObjectIds'),
  }),
});
