import { z } from 'zod';

export const createMilestoneSchema = z.object({
  body: z.object({
    workspaceId: z.string({ required_error: 'Workspace ID is required' }),
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(150),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(5, 'Description must be at least 5 characters')
      .max(2000),
    dueDate: z.string({ required_error: 'Due date is required' }),
    order: z.number().optional(),
  }),
});

export const submitDeliverableSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    deliverableUrl: z.string().url('Deliverable URL must be a valid URL'),
    deliverableNotes: z.string().trim().max(2000).optional(),
  }),
});

export const verifyMilestoneSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    status: z.enum(['verified', 'rejected'], {
      required_error: 'Verification status must be verified or rejected',
    }),
    feedback: z.string().trim().max(1000).optional(),
  }),
});
