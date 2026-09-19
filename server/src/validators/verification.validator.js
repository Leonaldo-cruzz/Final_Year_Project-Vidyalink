import { z } from 'zod';
import { VERIFICATION_TARGET_TYPES } from '../models/verification.model.js';

const objectIdSchema = z
  .string({ required_error: 'Target ID is required' })
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Target ID must be a valid MongoDB ObjectId');

const targetTypeSchema = z.enum(VERIFICATION_TARGET_TYPES, {
  errorMap: () => ({ message: `Target type must be one of: ${VERIFICATION_TARGET_TYPES.join(', ')}` }),
});

const dashboardStatusSchema = z.enum([
  'ALL',
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'CHANGES_REQUESTED',
]);

const dashboardSortSchema = z.enum(['NEWEST', 'OLDEST', 'HIGHEST_PRIORITY']);

const optionalRemarksSchema = z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? null : value),
  z.string().trim().max(2000, 'Remarks must not exceed 2000 characters').nullable().optional()
);

const requiredRemarksSchema = z
  .string({ required_error: 'Remarks are required' })
  .trim()
  .min(1, 'Remarks are required')
  .max(2000, 'Remarks must not exceed 2000 characters');

export const submitVerificationSchema = z.object({
  body: z.object({
    targetType: targetTypeSchema,
    targetId: objectIdSchema,
    remarks: optionalRemarksSchema,
  }),
});

export const verificationHistorySchema = z.object({
  query: z.object({
    targetType: targetTypeSchema.optional(),
    targetId: objectIdSchema.optional(),
  }).refine(
    (query) => !query.targetId || query.targetType,
    { message: 'targetType is required when targetId is provided', path: ['targetType'] }
  ),
});

export const verificationStatusSchema = z.object({
  params: z.object({
    targetType: targetTypeSchema,
    targetId: objectIdSchema,
  }),
});

export const verificationIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const approveVerificationSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    remarks: optionalRemarksSchema,
  }),
});

export const rejectVerificationSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    remarks: requiredRemarksSchema,
  }),
});

export const requestChangesVerificationSchema = rejectVerificationSchema;

export const facultyVerificationDashboardSchema = z.object({
  query: z.object({
    status: dashboardStatusSchema.optional(),
    targetType: z.enum([...VERIFICATION_TARGET_TYPES, 'ALL']).optional(),
    search: z.string().trim().max(200, 'Search must not exceed 200 characters').optional(),
    sort: dashboardSortSchema.optional(),
  }),
});

export const facultyVerificationDetailSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const studentSummarySchema = z.object({
  params: z.object({
    studentId: z
      .string({ required_error: 'Student ID is required' })
      .trim()
      .regex(/^[a-f\d]{24}$/i, 'Student ID must be a valid MongoDB ObjectId'),
  }),
});
