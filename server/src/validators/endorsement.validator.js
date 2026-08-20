import { z } from 'zod';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const mongoId = (fieldName) =>
  z
    .string({ required_error: `${fieldName} is required` })
    .regex(/^[a-f\d]{24}$/i, `${fieldName} must be a valid MongoDB ObjectId`);

// ─── Create endorsement (alumni) ──────────────────────────────────────────────

export const createEndorsementSchema = z.object({
  body: z.object({
    studentId: mongoId('Student ID'),
    skill: z
      .string({ required_error: 'Skill is required' })
      .trim()
      .min(1, 'Skill cannot be empty')
      .max(50, 'Skill must not exceed 50 characters'),
    message: z
      .string()
      .trim()
      .max(500, 'Endorsement message must not exceed 500 characters')
      .optional(),
  }).strict(),
});

// ─── Param: studentId ─────────────────────────────────────────────────────────

export const studentIdParamSchema = z.object({
  params: z.object({
    studentId: mongoId('Student ID'),
  }),
});

// ─── Param: endorsement id ────────────────────────────────────────────────────

export const endorsementIdParamSchema = z.object({
  params: z.object({
    id: mongoId('Endorsement ID'),
  }),
});
