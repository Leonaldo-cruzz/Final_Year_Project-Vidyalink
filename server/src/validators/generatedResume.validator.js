import { z } from 'zod';
import { RESUME_SECTIONS } from '../models/resumeDocument.model.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid source ID');
const text = (label, max) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const skillList = z.array(z.string().trim().min(1).max(50)).max(50).default([]);

const generateBody = z.object({
  targetRole: text('Target role', 150),
  targetCompany: optionalText(200),
  jobDescription: optionalText(10000),
  requiredSkills: skillList,
  preferredSkills: skillList,
  selectedSections: z.array(z.enum(RESUME_SECTIONS)).min(1, 'Select at least one section').max(RESUME_SECTIONS.length)
    .refine((items) => new Set(items).size === items.length, 'Sections must be unique'),
  selectedProjectIds: z.array(objectId).max(30).default([]),
  selectedCertificateIds: z.array(objectId).max(30).default([]),
});

export const generateResumeSchema = z.object({ body: generateBody });
export const updateGeneratedResumeSchema = z.object({
  body: generateBody.partial().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update'),
  params: z.object({ id: objectId }),
});
export const generatedResumeIdSchema = z.object({ params: z.object({ id: objectId }) });
