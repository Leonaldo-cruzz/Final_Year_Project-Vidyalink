import { z } from 'zod';

// ─── Shared Primitives ────────────────────────────────────────────────────────

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = (fieldName = 'ID') =>
  z
    .string({ required_error: `${fieldName} is required` })
    .trim()
    .regex(
      OBJECT_ID_REGEX,
      `Invalid ${fieldName} format (must be a 24-character hexadecimal ObjectId)`
    );

const objectIdParam = (fieldName = 'Interview ID') =>
  z.object({
    params: z.object({
      id: objectIdSchema(fieldName),
    }),
  });

const paginationQuery = z.object({
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
});

// ─── POST /recruiter/interviews ──────────────────────────────────────────────

export const createInterviewSchema = z.object({
  body: z
    .object({
      studentId: objectIdSchema('Student ID'),
      projectId: objectIdSchema('Project ID').optional(),
      shortlistId: objectIdSchema('Shortlist ID').optional(),

      title: z
        .string({ required_error: 'Title is required' })
        .trim()
        .min(3, 'Title must be at least 3 characters')
        .max(200, 'Title must not exceed 200 characters'),

      description: z
        .string()
        .trim()
        .max(2000, 'Description must not exceed 2000 characters')
        .optional()
        .nullable(),

      scheduledAt: z
        .string({ required_error: 'Scheduled date/time is required' })
        .datetime({ message: 'scheduledAt must be a valid ISO 8601 datetime' })
        .refine(
          (val) => new Date(val) > new Date(),
          'scheduledAt must be a future date and time'
        ),

      durationMinutes: z
        .number({ required_error: 'Duration in minutes is required' })
        .int('Duration must be a whole number')
        .min(15, 'Duration must be at least 15 minutes')
        .max(180, 'Duration must not exceed 180 minutes'),

      mode: z.enum(['ONLINE', 'OFFLINE'], {
        required_error: 'Mode is required',
        invalid_type_error: 'Mode must be either ONLINE or OFFLINE',
      }),

      meetingUrl: z
        .string()
        .trim()
        .url('meetingUrl must be a valid URL')
        .max(500, 'Meeting URL must not exceed 500 characters')
        .optional()
        .nullable(),

      location: z
        .string()
        .trim()
        .min(2, 'Location must be at least 2 characters')
        .max(500, 'Location must not exceed 500 characters')
        .optional()
        .nullable(),

      recruiterNotes: z
        .string()
        .trim()
        .max(2000, 'Recruiter notes must not exceed 2000 characters')
        .optional()
        .nullable(),
    })
    // Cross-field: ONLINE requires meetingUrl; OFFLINE requires location
    .superRefine((data, ctx) => {
      if (data.mode === 'ONLINE' && !data.meetingUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['meetingUrl'],
          message: 'meetingUrl is required for ONLINE interviews',
        });
      }
      if (data.mode === 'OFFLINE' && !data.location) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['location'],
          message: 'location is required for OFFLINE interviews',
        });
      }
    }),
});

// ─── PATCH /recruiter/interviews/:id ────────────────────────────────────────

export const updateInterviewSchema = z.object({
  params: z.object({
    id: objectIdSchema('Interview ID'),
  }),
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(3, 'Title must be at least 3 characters')
        .max(200, 'Title must not exceed 200 characters')
        .optional(),

      description: z
        .string()
        .trim()
        .max(2000, 'Description must not exceed 2000 characters')
        .optional()
        .nullable(),

      mode: z.enum(['ONLINE', 'OFFLINE']).optional(),

      meetingUrl: z
        .string()
        .trim()
        .url('meetingUrl must be a valid URL')
        .max(500)
        .optional()
        .nullable(),

      location: z
        .string()
        .trim()
        .min(2)
        .max(500)
        .optional()
        .nullable(),

      recruiterNotes: z
        .string()
        .trim()
        .max(2000, 'Recruiter notes must not exceed 2000 characters')
        .optional()
        .nullable(),
    })
    .superRefine((data, ctx) => {
      if (data.mode === 'ONLINE' && data.meetingUrl === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['meetingUrl'],
          message: 'meetingUrl cannot be removed from an ONLINE interview',
        });
      }
      if (data.mode === 'OFFLINE' && data.location === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['location'],
          message: 'location cannot be removed from an OFFLINE interview',
        });
      }
    }),
});

// ─── PATCH /recruiter/interviews/:id/reschedule ──────────────────────────────

export const rescheduleInterviewSchema = z.object({
  params: z.object({
    id: objectIdSchema('Interview ID'),
  }),
  body: z
    .object({
      scheduledAt: z
        .string({ required_error: 'New scheduledAt date/time is required' })
        .datetime({ message: 'scheduledAt must be a valid ISO 8601 datetime' })
        .refine(
          (val) => new Date(val) > new Date(),
          'scheduledAt must be a future date and time'
        ),

      durationMinutes: z
        .number()
        .int('Duration must be a whole number')
        .min(15, 'Duration must be at least 15 minutes')
        .max(180, 'Duration must not exceed 180 minutes')
        .optional(),

      mode: z.enum(['ONLINE', 'OFFLINE']).optional(),

      meetingUrl: z
        .string()
        .trim()
        .url('meetingUrl must be a valid URL')
        .max(500)
        .optional()
        .nullable(),

      location: z
        .string()
        .trim()
        .min(2)
        .max(500)
        .optional()
        .nullable(),

      recruiterNotes: z
        .string()
        .trim()
        .max(2000)
        .optional()
        .nullable(),
    })
    .superRefine((data, ctx) => {
      if (data.mode === 'ONLINE' && data.meetingUrl === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['meetingUrl'],
          message: 'meetingUrl cannot be null for an ONLINE interview',
        });
      }
      if (data.mode === 'OFFLINE' && data.location === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['location'],
          message: 'location cannot be null for an OFFLINE interview',
        });
      }
    }),
});

// ─── PATCH /recruiter/interviews/:id/cancel ──────────────────────────────────

export const cancelInterviewSchema = z.object({
  params: z.object({
    id: objectIdSchema('Interview ID'),
  }),
  body: z.object({
    cancelReason: z
      .string()
      .trim()
      .min(5, 'Cancel reason must be at least 5 characters')
      .max(1000, 'Cancel reason must not exceed 1000 characters')
      .optional(),
  }),
});

// ─── PATCH /recruiter/interviews/:id/complete ────────────────────────────────

export const completeInterviewSchema = objectIdParam('Interview ID');

// ─── GET /recruiter/interviews ───────────────────────────────────────────────

export const recruiterInterviewsQuerySchema = z.object({
  query: z.object({
    ...paginationQuery.shape,
    status: z
      .enum(['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
      .optional(),
    studentId: objectIdSchema('Student ID').optional(),
    from: z
      .string()
      .datetime({ message: 'from must be a valid ISO 8601 datetime' })
      .optional(),
    to: z
      .string()
      .datetime({ message: 'to must be a valid ISO 8601 datetime' })
      .optional(),
  }),
});

// ─── GET /recruiter/interviews/:id ──────────────────────────────────────────

export const interviewParamSchema = objectIdParam('Interview ID');

// ─── GET /student/interviews ──────────────────────────────────────────────────

export const studentInterviewsQuerySchema = z.object({
  query: z.object({
    ...paginationQuery.shape,
    status: z
      .enum(['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
      .optional(),
    from: z
      .string()
      .datetime({ message: 'from must be a valid ISO 8601 datetime' })
      .optional(),
    to: z
      .string()
      .datetime({ message: 'to must be a valid ISO 8601 datetime' })
      .optional(),
  }),
});

// ─── GET /student/interviews/:id ──────────────────────────────────────────────

export const studentInterviewParamSchema = z.object({
  params: z.object({
    id: objectIdSchema('Interview ID'),
  }),
});

