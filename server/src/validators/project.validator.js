import { z } from 'zod';

export const createProjectBodySchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(150, 'Title must not exceed 150 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  company: z
    .string()
    .trim()
    .min(2, 'Company name must be at least 2 characters')
    .optional(),
  domain: z
    .string()
    .trim()
    .min(2, 'Domain must be at least 2 characters')
    .optional(),
  requiredSkills: z
    .array(z.string().trim().min(1).max(50))
    .optional(),
  difficulty: z
    .enum(['Beginner', 'Intermediate', 'Advanced'])
    .optional(),
  duration: z.string().trim().optional(),
  stipend: z.number().min(0).optional(),
  mode: z
    .enum(['Remote', 'Hybrid', 'In-office'])
    .optional(),
  deadline: z.string().optional().nullable(),
  status: z
    .enum(['open', 'in_progress', 'completed', 'closed'])
    .optional(),
});

export const updateProjectBodySchema = createProjectBodySchema.partial();

export const createProjectSchema = z.object({
  body: createProjectBodySchema,
});

export const updateProjectSchema = z.object({
  body: updateProjectBodySchema,
});
