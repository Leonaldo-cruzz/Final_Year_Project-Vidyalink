import { z } from 'zod';
import { ENGAGEMENT_STATUSES } from '../models/projectEngagement.model.js';

const objectIdSchema = z
  .string({ required_error: 'A valid ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'A valid ID is required');

const scheduleFieldsSchema = z.object({
  startDate: z.coerce.date().optional(),
  expectedEndDate: z.coerce.date().nullable().optional(),
});

const hasValidSchedule = (data) => {
  if (!data.startDate || !data.expectedEndDate) return true;
  return data.expectedEndDate >= data.startDate;
};

export const createEngagementSchema = z.object({
  body: z
    .object({
      projectOpportunityId: objectIdSchema,
      studentId: objectIdSchema,
      facultyId: objectIdSchema.nullable().optional(),
      status: z.enum(ENGAGEMENT_STATUSES).optional(),
      progressPercentage: z.number().min(0).max(100).optional(),
      currentMilestone: z.string().trim().max(200).nullable().optional(),
      ...scheduleFieldsSchema.shape,
    })
    .refine(hasValidSchedule, {
      message: 'Expected end date must be on or after the start date',
      path: ['expectedEndDate'],
    }),
});

export const updateEngagementSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      status: z.enum(ENGAGEMENT_STATUSES).optional(),
      progressPercentage: z.number().min(0).max(100).optional(),
      currentMilestone: z.string().trim().max(200).nullable().optional(),
      completedDate: z.coerce.date().nullable().optional(),
      ...scheduleFieldsSchema.shape,
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one engagement field must be provided',
    })
    .refine(hasValidSchedule, {
      message: 'Expected end date must be on or after the start date',
      path: ['expectedEndDate'],
    }),
});

export const engagementIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});
