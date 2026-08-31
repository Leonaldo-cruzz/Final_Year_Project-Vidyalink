import { z } from 'zod';

const optionalUrl = (fieldName) =>
  z
    .string()
    .trim()
    .url(`${fieldName} must be a valid URL`)
    .max(2048, `${fieldName} must not exceed 2048 characters`)
    .nullable()
    .optional()
    .refine(
      (value) => value === undefined || value === null || /^https?:\/\//i.test(value),
      `${fieldName} must use HTTP or HTTPS`
    );

export const createRecruiterProfileSchema = z.object({
  body: z.object({
    companyName: z
      .string({ required_error: 'Company name is required' })
      .trim()
      .min(2, 'Company name must be at least 2 characters')
      .max(200, 'Company name must not exceed 200 characters'),
    companyWebsite: optionalUrl('Company website'),
    companyDescription: z
      .string()
      .trim()
      .max(5000, 'Company description must not exceed 5000 characters')
      .nullable()
      .optional(),
    industry: z
      .string()
      .trim()
      .max(100, 'Industry must not exceed 100 characters')
      .nullable()
      .optional(),
    designation: z
      .string()
      .trim()
      .max(100, 'Designation must not exceed 100 characters')
      .nullable()
      .optional(),
    location: z
      .string()
      .trim()
      .max(200, 'Location must not exceed 200 characters')
      .nullable()
      .optional(),
    companyLogo: optionalUrl('Company logo'),
  }),
});

export const updateRecruiterProfileSchema = z.object({
  body: z
    .object({
      companyName: z
        .string()
        .trim()
        .min(2, 'Company name must be at least 2 characters')
        .max(200, 'Company name must not exceed 200 characters')
        .optional(),
      companyWebsite: optionalUrl('Company website'),
      companyDescription: z
        .string()
        .trim()
        .max(5000, 'Company description must not exceed 5000 characters')
        .nullable()
        .optional(),
      industry: z
        .string()
        .trim()
        .max(100, 'Industry must not exceed 100 characters')
        .nullable()
        .optional(),
      designation: z
        .string()
        .trim()
        .max(100, 'Designation must not exceed 100 characters')
        .nullable()
        .optional(),
      location: z
        .string()
        .trim()
        .max(200, 'Location must not exceed 200 characters')
        .nullable()
        .optional(),
      companyLogo: optionalUrl('Company logo'),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

