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

const optionalProfilePicture = z
  .string()
  .trim()
  .max(2048, 'Profile picture URL must not exceed 2048 characters')
  .refine(
    (value) => /^https?:\/\//i.test(value) || /^\/uploads\/profile-photos\/[a-f\d-]+\.(?:jpg|jpeg|png|webp)$/i.test(value),
    'Profile picture must be an HTTP(S) URL or a valid uploaded image path'
  )
  .nullable()
  .optional();

const optionalStringList = (fieldName) => z
  .array(
    z.string()
      .trim()
      .min(1, `${fieldName} entries cannot be empty`)
      .max(50, `${fieldName} entries must not exceed 50 characters`)
  )
  .max(MAX_LIST_ENTRIES, `${fieldName} cannot exceed ${MAX_LIST_ENTRIES} entries`)
  .optional();

const optionalPhone = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, 'Phone number must use international format, for example +919876543210')
  .nullable()
  .optional();

const optionalGithubUsername = z
  .string()
  .trim()
  .min(1, 'GitHub username cannot be empty')
  .max(39, 'GitHub username must not exceed 39 characters')
  .regex(/^(?!-)[A-Za-z\d]+(?:-[A-Za-z\d]+)*$/, 'GitHub username may contain letters, numbers, and hyphens')
  .nullable()
  .optional();

const profileFields = {
  fullName: requiredText('Full name', 2, 100),
  college: requiredText('College', 2, 200),
  branch: requiredText('Branch', 2, 100),
  graduationYear: z.coerce
    .number({ required_error: 'Graduation year is required' })
    .int('Graduation year must be a whole number')
    .min(1900, 'Graduation year must be after 1900')
    .max(currentYear + 20, `Graduation year must not exceed ${currentYear + 20}`),
  currentYear: z.coerce
    .number()
    .int('Current year must be a whole number')
    .min(1, 'Current year must be at least 1')
    .max(10, 'Current year cannot exceed 10')
    .nullable()
    .optional(),
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
  profilePicture: optionalProfilePicture,
  phone: optionalPhone,
  githubUsername: optionalGithubUsername,
};

const createProfileBodySchema = z.object({
  ...profileFields,
  graduationYear: profileFields.graduationYear.optional(),
}).strict();

export const createProfileSchema = z.object({
  body: createProfileBodySchema,
});

export const updateProfileSchema = z.object({
  body: createProfileBodySchema.partial().refine(
    (profileData) => Object.keys(profileData).length > 0,
    { message: 'At least one profile field is required' }
  ),
});
