import { z } from 'zod';
import { REFERRAL_STATUS } from '../models/referral.model.js';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const mongoId = (fieldName) =>
  z
    .string({ required_error: `${fieldName} is required` })
    .regex(/^[a-f\d]{24}$/i, `${fieldName} must be a valid MongoDB ObjectId`);

const optionalUrl = (fieldName) =>
  z
    .string()
    .trim()
    .url(`${fieldName} must be a valid URL`)
    .max(2048, `${fieldName} URL must not exceed 2048 characters`)
    .nullable()
    .optional();

// ─── Create referral ──────────────────────────────────────────────────────────

export const createReferralSchema = z.object({
  body: z.object({
    studentId: mongoId('Student ID'),
    companyName: z
      .string({ required_error: 'Company name is required' })
      .trim()
      .min(1, 'Company name cannot be empty')
      .max(200, 'Company name must not exceed 200 characters'),
    jobTitle: z
      .string({ required_error: 'Job title is required' })
      .trim()
      .min(1, 'Job title cannot be empty')
      .max(150, 'Job title must not exceed 150 characters'),
    jobUrl: optionalUrl('Job'),
    message: z
      .string()
      .trim()
      .max(2000, 'Message must not exceed 2000 characters')
      .optional(),
    status: z
      .enum(Object.values(REFERRAL_STATUS), {
        errorMap: () => ({
          message: `Status must be one of: ${Object.values(REFERRAL_STATUS).join(', ')}`,
        }),
      })
      .optional(),
  }).strict(),
});

// ─── Update referral ──────────────────────────────────────────────────────────

export const updateReferralSchema = z.object({
  params: z.object({
    id: mongoId('Referral ID'),
  }),
  body: z
    .object({
      companyName: z.string().trim().min(1).max(200).optional(),
      jobTitle: z.string().trim().min(1).max(150).optional(),
      jobUrl: optionalUrl('Job'),
      message: z.string().trim().max(2000).optional(),
      status: z
        .enum(Object.values(REFERRAL_STATUS), {
          errorMap: () => ({
            message: `Status must be one of: ${Object.values(REFERRAL_STATUS).join(', ')}`,
          }),
        })
        .optional(),
    })
    .strict()
    .refine(
      (data) => Object.keys(data).length > 0,
      { message: 'At least one field is required for update' }
    ),
});

// ─── Generic ID param ─────────────────────────────────────────────────────────

export const referralIdParamSchema = z.object({
  params: z.object({
    id: mongoId('Referral ID'),
  }),
});
