import { z } from 'zod';

const currentYear = new Date().getFullYear();
const MAX_LIST_ENTRIES = 50;

const requiredText = (fieldName, minLength, maxLength) => z
  .string({ required_error: `${fieldName} is required` })
  .trim()
  .min(minLength, `${fieldName} must be at least ${minLength} characters`)
  .max(maxLength, `${fieldName} must not exceed ${maxLength} characters`);

const optionalText = (fieldName, maxLength) => z
  .string()
  .trim()
  .max(maxLength, `${fieldName} must not exceed ${maxLength} characters`)
  .nullable()
  .optional();

const optionalUrl = (fieldName) => z
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

const optionalStringList = (fieldName) => z
  .array(
    z.string()
      .trim()
      .min(1, `${fieldName} entries cannot be empty`)
      .max(50, `${fieldName} entries must not exceed 50 characters`)
  )
  .max(MAX_LIST_ENTRIES, `${fieldName} cannot exceed ${MAX_LIST_ENTRIES} entries`)
  .optional();

const profileFields = {
  fullName: requiredText('Full name', 3, 100),
  college: requiredText('College', 2, 200),
  branch: requiredText('Branch', 2, 100),
  graduationYear: z.coerce
    .number({ required_error: 'Graduation year is required' })
    .int('Graduation year must be a whole number')
    .min(1900, 'Graduation year must be after 1900')
    .max(currentYear + 20, `Graduation year must not exceed ${currentYear + 20}`),
  headline: optionalText('Headline', 200),
  bio: optionalText('Bio', 2000),
  degree: optionalText('Degree', 150),
  cgpa: z.coerce
    .number()
    .min(0, 'CGPA cannot be negative')
    .max(10, 'CGPA cannot exceed 10')
    .nullable()
    .optional(),
  skills: optionalStringList('Skills'),
  interests: optionalStringList('Interests'),
  github: optionalUrl('GitHub URL'),
  linkedin: optionalUrl('LinkedIn URL'),
  portfolio: optionalUrl('Portfolio URL'),
  resumeUrl: optionalUrl('Resume URL'),
  profilePicture: optionalUrl('Profile picture URL'),
};

const createProfileBodySchema = z.object(profileFields).strict();

export const createProfileSchema = z.object({
  body: createProfileBodySchema,
});

export const updateProfileSchema = z.object({
  body: createProfileBodySchema.partial().refine(
    (profileData) => Object.keys(profileData).length > 0,
    { message: 'At least one profile field is required' }
  ),
});
