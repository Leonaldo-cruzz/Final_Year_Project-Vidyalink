import { z } from 'zod';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const mongoId = (fieldName) =>
  z
    .string({ required_error: `${fieldName} is required` })
    .regex(/^[a-f\d]{24}$/i, `${fieldName} must be a valid MongoDB ObjectId`);

// ─── Create mentorship request (student → alumni) ─────────────────────────────

export const createMentorshipRequestSchema = z.object({
  body: z.object({
    alumniId: mongoId('Alumni ID'),
    topic: z
      .string({ required_error: 'Topic is required' })
      .trim()
      .min(3, 'Topic must be at least 3 characters')
      .max(200, 'Topic must not exceed 200 characters'),
    message: z
      .string({ required_error: 'Message is required' })
      .trim()
      .min(10, 'Message must be at least 10 characters')
      .max(2000, 'Message must not exceed 2000 characters'),
  }).strict(),
});

// ─── Accept a request (alumni) ────────────────────────────────────────────────

export const acceptMentorshipSchema = z.object({
  params: z.object({
    id: mongoId('Request ID'),
  }),
  body: z.object({
    responseMessage: z
      .string()
      .trim()
      .max(2000, 'Response message must not exceed 2000 characters')
      .optional(),
  }),
});

// ─── Decline a request (alumni) ───────────────────────────────────────────────

export const declineMentorshipSchema = z.object({
  params: z.object({
    id: mongoId('Request ID'),
  }),
  body: z.object({
    responseMessage: z
      .string()
      .trim()
      .max(2000, 'Response message must not exceed 2000 characters')
      .optional(),
  }),
});

// ─── Generic ID param (cancel, complete, getById) ────────────────────────────

export const idParamSchema = z.object({
  params: z.object({
    id: mongoId('Request ID'),
  }),
});
