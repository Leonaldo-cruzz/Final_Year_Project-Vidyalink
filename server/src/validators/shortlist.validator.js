import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = (fieldName = 'ID') =>
  z
    .string({ required_error: `${fieldName} is required` })
    .trim()
    .regex(OBJECT_ID_REGEX, `Invalid ${fieldName} format (must be a 24-character hexadecimal ObjectId)`);

export const createShortlistSchema = z.object({
  body: z.object({
    studentId: objectIdSchema('Student ID'),
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes must not exceed 1000 characters')
      .nullable()
      .optional(),
  }),
});

export const shortlistParamSchema = z.object({
  params: z.object({
    studentId: objectIdSchema('Student ID'),
  }),
});

export const getShortlistsSchema = z.object({
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
    status: z.enum(['SHORTLISTED', 'REMOVED', 'ALL']).optional().default('SHORTLISTED'),
  }),
});

