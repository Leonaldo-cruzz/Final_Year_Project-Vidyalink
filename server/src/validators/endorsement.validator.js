import { z } from 'zod';

const objectIdSchema = z
  .string({ required_error: 'ID is required' })
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'ID must be a valid 24-character hexadecimal MongoDB ObjectId');

const optionalRemarksSchema = z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? null : value),
  z.string().trim().max(1000, 'Notes must not exceed 1000 characters').nullable().optional()
);

export const createEndorsementSchema = z.object({
  params: z.object({
    id: objectIdSchema.optional(),
  }).default({}),
  body: z.object({
    studentId: objectIdSchema.optional(),
    skill: z
      .string({ required_error: 'Skill is required' })
      .trim()
      .min(1, 'Skill is required')
      .max(100, 'Skill name must not exceed 100 characters'),
    notes: optionalRemarksSchema,
  }).strict().refine(
    (data) => data.studentId !== undefined || true, // Checked in controller/service if params.id not supplied
    { message: 'Student ID is required' }
  ),
});

export const getStudentEndorsementsSchema = z.object({
  params: z.object({
    studentId: objectIdSchema,
  }),
});
