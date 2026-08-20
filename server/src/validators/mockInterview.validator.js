import { z } from 'zod';
import { MOCK_INTERVIEW_MODE } from '../models/mockInterviewRequest.model.js';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const mongoId = (fieldName) =>
  z
    .string({ required_error: `${fieldName} is required` })
    .regex(/^[a-f\d]{24}$/i, `${fieldName} must be a valid MongoDB ObjectId`);

const MODE_VALUES = Object.values(MOCK_INTERVIEW_MODE);

// ─── Create mock interview request (student) ──────────────────────────────────

export const createMockInterviewSchema = z.object({
  body: z
    .object({
      alumniId: mongoId('Alumni ID'),
      topic: z
        .string({ required_error: 'Topic is required' })
        .trim()
        .min(3, 'Topic must be at least 3 characters')
        .max(200, 'Topic must not exceed 200 characters'),
      scheduledAt: z
        .string({ required_error: 'Scheduled date/time is required' })
        .datetime({ message: 'scheduledAt must be a valid ISO 8601 datetime' }),
      durationMinutes: z.coerce
        .number({ required_error: 'Duration is required' })
        .int('Duration must be a whole number')
        .min(15, 'Duration must be at least 15 minutes')
        .max(240, 'Duration cannot exceed 240 minutes'),
      mode: z.enum(MODE_VALUES, {
        errorMap: () => ({
          message: `Mode must be one of: ${MODE_VALUES.join(', ')}`,
        }),
      }),
      meetingUrl: z
        .string()
        .trim()
        .url('Meeting URL must be a valid URL')
        .max(2048)
        .optional()
        .nullable(),
      location: z
        .string()
        .trim()
        .max(300, 'Location must not exceed 300 characters')
        .optional()
        .nullable(),
    })
    .strict()
    .refine(
      (data) =>
        data.scheduledAt === undefined ||
        new Date(data.scheduledAt) > new Date(),
      { message: 'Scheduled time must be in the future', path: ['scheduledAt'] }
    ),
});

// ─── Accept (alumni) — provides meeting URL or location ──────────────────────

export const acceptMockInterviewSchema = z.object({
  params: z.object({
    id: mongoId('Request ID'),
  }),
  body: z
    .object({
      meetingUrl: z
        .string()
        .trim()
        .url('Meeting URL must be a valid URL')
        .max(2048)
        .optional()
        .nullable(),
      location: z
        .string()
        .trim()
        .max(300, 'Location must not exceed 300 characters')
        .optional()
        .nullable(),
    })
    .strict(),
});

// ─── Reschedule (alumni) ──────────────────────────────────────────────────────

export const rescheduleMockInterviewSchema = z.object({
  params: z.object({
    id: mongoId('Request ID'),
  }),
  body: z
    .object({
      scheduledAt: z
        .string({ required_error: 'New scheduled date/time is required' })
        .datetime({ message: 'scheduledAt must be a valid ISO 8601 datetime' }),
      durationMinutes: z.coerce
        .number()
        .int()
        .min(15)
        .max(240)
        .optional(),
      meetingUrl: z
        .string()
        .trim()
        .url('Meeting URL must be a valid URL')
        .max(2048)
        .optional()
        .nullable(),
      location: z
        .string()
        .trim()
        .max(300)
        .optional()
        .nullable(),
    })
    .strict()
    .refine(
      (data) => new Date(data.scheduledAt) > new Date(),
      { message: 'Rescheduled time must be in the future', path: ['scheduledAt'] }
    ),
});

// ─── Complete (alumni) — provide feedback ────────────────────────────────────

export const completeMockInterviewSchema = z.object({
  params: z.object({
    id: mongoId('Request ID'),
  }),
  body: z.object({
    feedback: z
      .string({ required_error: 'Feedback is required' })
      .trim()
      .min(10, 'Feedback must be at least 10 characters')
      .max(3000, 'Feedback must not exceed 3000 characters'),
  }).strict(),
});

// ─── Generic ID param ─────────────────────────────────────────────────────────

export const mockInterviewIdParamSchema = z.object({
  params: z.object({
    id: mongoId('Request ID'),
  }),
});
