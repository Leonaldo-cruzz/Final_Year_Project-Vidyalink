import { z } from 'zod';
import { PROJECT_CATEGORIES, PROJECT_STATUSES } from '../models/project.model.js';

const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;

  const trimmedValue = value.trim();
  if (!trimmedValue) return [];

  try {
    const parsedValue = JSON.parse(trimmedValue);
    return Array.isArray(parsedValue) ? parsedValue : value.split(',');
  } catch {
    return value.split(',');
  }
};

const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? null : value),
  z.string().trim().url('Please provide a valid URL').max(2048).nullable().optional()
);

const optionalString = (maxLength) => z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? null : value),
  z.string().trim().max(maxLength).nullable().optional()
);

const technologiesSchema = z.preprocess(
  parseArray,
  z.array(z.string().trim().min(1).max(50))
    .min(1, 'Please add at least one technology')
    .transform((items) => [...new Set(items.map((item) => item.trim()).filter(Boolean))])
);

const teamMembersSchema = z.preprocess(
  parseArray,
  z.array(z.string().trim().min(1).max(100))
    .transform((items) => [...new Set(items.map((item) => item.trim()).filter(Boolean))])
    .optional()
);

const screenshotsSchema = z.preprocess(
  parseArray,
  z.array(z.string().trim().url('Please provide a valid screenshot URL').max(2048)).optional()
);

const dateSchema = z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? null : value),
  z.string().date('Please provide a valid date').nullable().optional()
);

const createProjectBodySchema = z.object({
  title: z.string({ required_error: 'Title is required' }).trim().min(2).max(150),
  shortDescription: z
    .string({ required_error: 'Short description is required' })
    .trim()
    .min(10, 'Short description must be at least 10 characters')
    .max(500),
  detailedDescription: z
    .string({ required_error: 'Detailed description is required' })
    .trim()
    .min(20, 'Detailed description must be at least 20 characters')
    .max(5000),
  category: z.enum(PROJECT_CATEGORIES, { required_error: 'Category is required' }),
  domain: optionalString(100),
  technologies: technologiesSchema,
  githubRepository: optionalUrl,
  liveDeployment: optionalUrl,
  demoVideo: optionalUrl,
  documentationUrl: optionalUrl,
  teamMembers: teamMembersSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  projectStatus: z.enum(PROJECT_STATUSES).optional(),
  featured: z.preprocess(
    (value) => (typeof value === 'string' ? value === 'true' : value),
    z.boolean().optional()
  ),
});

const updateProjectBodySchema = createProjectBodySchema.partial().extend({
  screenshots: screenshotsSchema,
  existingScreenshots: screenshotsSchema,
});

const parseOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
};

export const getProjectsQuerySchema = z.object({
  query: z
    .object({
      branch: z.string().trim().max(100).optional(),
      graduationYear: z.preprocess(
        parseOptionalNumber,
        z
          .number({ invalid_type_error: 'Graduation year must be a valid number' })
          .int('Graduation year must be an integer')
          .min(1900, 'Graduation year must be after 1900')
          .max(2100, 'Graduation year must be before 2100')
          .optional()
      ),
      minAiScore: z.preprocess(
        parseOptionalNumber,
        z
          .number({ invalid_type_error: 'Minimum AI score must be a valid number' })
          .min(0, 'Minimum AI score must be at least 0')
          .max(100, 'Minimum AI score cannot exceed 100')
          .optional()
      ),
      maxAiScore: z.preprocess(
        parseOptionalNumber,
        z
          .number({ invalid_type_error: 'Maximum AI score must be a valid number' })
          .min(0, 'Maximum AI score must be at least 0')
          .max(100, 'Maximum AI score cannot exceed 100')
          .optional()
      ),
      category: z.string().trim().max(100).optional(),
      technology: z.string().trim().max(100).optional(),
      search: z.string().trim().max(200).optional(),
      filter: z.string().trim().max(50).optional(),
      sort: z.string().trim().max(50).optional(),
      page: z.preprocess(
        parseOptionalNumber,
        z.number({ invalid_type_error: 'Page must be a valid number' }).int('Page must be an integer').min(1, 'Page must be at least 1').optional()
      ),
      limit: z.preprocess(
        parseOptionalNumber,
        z.number({ invalid_type_error: 'Limit must be a valid number' }).int('Limit must be an integer').min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').optional()
      ),
    })
    .refine(
      (data) => {
        if (data.minAiScore !== undefined && data.maxAiScore !== undefined) {
          return data.minAiScore <= data.maxAiScore;
        }
        return true;
      },
      {
        message: 'Minimum AI score cannot exceed maximum AI score',
        path: ['minAiScore'],
      }
    ),
});

export const createProjectSchema = z.object({ body: createProjectBodySchema });
export const updateProjectSchema = z.object({ body: updateProjectBodySchema });
