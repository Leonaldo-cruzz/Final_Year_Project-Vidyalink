import { z } from 'zod';

const MAX_YEAR = 2100;

const optionalText = (maxLength) => z.string().trim().max(maxLength).nullable().optional();
const optionalUrl = (fieldName) => z
  .string()
  .trim()
  .url(`${fieldName} must be a valid URL`)
  .max(2048, `${fieldName} must not exceed 2048 characters`)
  .nullable()
  .optional();
const optionalYear = z.coerce
  .number()
  .int('Year must be a whole number')
  .min(1900, 'Year must be after 1900')
  .max(MAX_YEAR, `Year must not exceed ${MAX_YEAR}`)
  .nullable()
  .optional();

const educationEntrySchema = z.object({
  institution: z.string().trim().min(2, 'Institution is required').max(200),
  degree: z.string().trim().min(2, 'Degree is required').max(150),
  fieldOfStudy: optionalText(150),
  startYear: optionalYear,
  endYear: optionalYear,
  description: optionalText(1000),
}).refine(
  ({ startYear, endYear }) => !startYear || !endYear || endYear >= startYear,
  { message: 'End year must be after or equal to start year', path: ['endYear'] }
);

const experienceEntrySchema = z.object({
  company: z.string().trim().min(2, 'Company is required').max(200),
  position: z.string().trim().min(2, 'Position is required').max(150),
  employmentType: optionalText(50),
  location: optionalText(150),
  startDate: z.coerce.date({ invalid_type_error: 'Start date must be a valid date' }),
  endDate: z.coerce.date({ invalid_type_error: 'End date must be a valid date' }).nullable().optional(),
  isCurrent: z.boolean().optional().default(false),
  description: optionalText(2000),
}).refine(
  ({ startDate, endDate, isCurrent }) => isCurrent || !endDate || endDate >= startDate,
  { message: 'End date must be after or equal to start date', path: ['endDate'] }
).refine(
  ({ endDate, isCurrent }) => !isCurrent || !endDate,
  { message: 'Current experience cannot have an end date', path: ['endDate'] }
);

const certificationEntrySchema = z.object({
  name: z.string().trim().min(2, 'Certification name is required').max(200),
  issuingOrganization: z.string().trim().min(2, 'Issuing organization is required').max(200),
  issueDate: z.coerce.date({ invalid_type_error: 'Issue date must be a valid date' }).nullable().optional(),
  credentialId: optionalText(200),
  credentialUrl: optionalUrl('Credential URL'),
});

const profileFields = {
  profilePicture: optionalUrl('Profile picture'),
  bio: optionalText(1000),
  phone: z.string().trim().regex(/^[0-9+()\-\s]{7,20}$/, 'Phone must be a valid phone number').nullable().optional(),
  location: optionalText(150),
  college: optionalText(200),
  department: optionalText(100),
  branch: optionalText(100),
  graduationYear: optionalYear,
  cgpa: z.coerce.number().min(0, 'CGPA cannot be negative').max(10, 'CGPA cannot exceed 10').nullable().optional(),
  linkedin: optionalUrl('LinkedIn URL'),
  githubUsername: z.string().trim().regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/, 'GitHub username is invalid').nullable().optional(),
  portfolioWebsite: optionalUrl('Portfolio website'),
  skills: z.array(z.string().trim().min(1).max(50)).max(50, 'Skills cannot exceed 50 entries').optional(),
  education: z.array(educationEntrySchema).max(20, 'Education cannot exceed 20 entries').optional(),
  experience: z.array(experienceEntrySchema).max(20, 'Experience cannot exceed 20 entries').optional(),
  certifications: z.array(certificationEntrySchema).max(30, 'Certifications cannot exceed 30 entries').optional(),
  resume: optionalUrl('Resume URL'),
};

export const createProfileSchema = z.object({
  body: z.object(profileFields).strict(),
});

export const updateProfileSchema = z.object({
  body: z.object(profileFields).strict().refine(
    (profileData) => Object.keys(profileData).length > 0,
    { message: 'At least one profile field is required' }
  ),
});
