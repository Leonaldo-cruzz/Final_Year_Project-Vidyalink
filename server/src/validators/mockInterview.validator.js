import { z } from 'zod';
import { MOCK_INTERVIEW_MODES, MOCK_INTERVIEW_STATUSES } from '../models/mockInterview.model.js';

const objectIdSchema = z
  .string({ required_error: 'ID is required' })
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'ID must be a valid 24-character hexadecimal MongoDB ObjectId');

const ratingSchema = (fieldName) =>
  z
    .number({ required_error: `${fieldName} is required` })
    .int(`${fieldName} must be an integer`)
    .min(1, `${fieldName} must be between 1 and 5`)
    .max(5, `${fieldName} must be between 1 and 5`);

export const scheduleMockInterviewSchema = z.object({
  body: z
    .object({
      studentId: objectIdSchema.optional(),
      alumniId: objectIdSchema.optional(),
      mentorshipId: objectIdSchema.optional(),
      scheduledDate: z
        .string({ required_error: 'Scheduled date is required' })
        .refine((val) => {
          const parsed = Date.parse(val);
          return !Number.isNaN(parsed) && new Date(parsed) > new Date();
        }, 'Scheduled date must be a valid future date'),
      mode: z.enum(MOCK_INTERVIEW_MODES).default('online'),
      meetingLink: z
        .string()
        .trim()
        .max(2048, 'Meeting link cannot exceed 2048 characters')
        .nullable()
        .optional(),
      location: z
        .string()
        .trim()
        .max(200, 'Location cannot exceed 200 characters')
        .nullable()
        .optional(),
      focusDomain: z
        .string({ required_error: 'Focus domain is required' })
        .trim()
        .min(2, 'Focus domain must be at least 2 characters')
        .max(150, 'Focus domain cannot exceed 150 characters'),
    })
    .strict(),
});

export const updateMockInterviewStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      status: z.enum(MOCK_INTERVIEW_STATUSES).optional(),
      scheduledDate: z
        .string()
        .refine((val) => {
          const parsed = Date.parse(val);
          return !Number.isNaN(parsed) && new Date(parsed) > new Date();
        }, 'Rescheduled date must be a valid future date')
        .optional(),
      cancellationReason: z
        .string()
        .trim()
        .max(1000, 'Cancellation reason cannot exceed 1000 characters')
        .optional(),
      meetingLink: z
        .string()
        .trim()
        .max(2048, 'Meeting link cannot exceed 2048 characters')
        .nullable()
        .optional(),
      location: z
        .string()
        .trim()
        .max(200, 'Location cannot exceed 200 characters')
        .nullable()
        .optional(),
    })
    .strict(),
});

export const submitMockInterviewFeedbackSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      technicalKnowledge: ratingSchema('Technical Knowledge'),
      problemSolving: ratingSchema('Problem-Solving'),
      communication: ratingSchema('Communication'),
      projectUnderstanding: ratingSchema('Project Understanding'),
      confidence: ratingSchema('Confidence and Professionalism'),
      strengths: z
        .string({ required_error: 'Strengths feedback is required' })
        .trim()
        .min(5, 'Strengths feedback must be at least 5 characters')
        .max(2000, 'Strengths feedback cannot exceed 2000 characters'),
      improvements: z
        .string({ required_error: 'Improvement suggestions are required' })
        .trim()
        .min(5, 'Improvement feedback must be at least 5 characters')
        .max(2000, 'Improvement feedback cannot exceed 2000 characters'),
      privateNotes: z
        .string()
        .trim()
        .max(2000, 'Private notes cannot exceed 2000 characters')
        .nullable()
        .optional(),
      feedbackVisibility: z.enum(['published', 'draft']).optional().default('published'),
    })
    .strict(),
});

export const mockInterviewIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});
