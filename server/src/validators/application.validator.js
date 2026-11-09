import { z } from 'zod';

const coverLetterField = z
  .string()
  .trim()
  .min(10, 'Cover letter must be at least 10 characters')
  .max(3000, 'Cover letter must not exceed 3000 characters');

// Accepts either naming: projectOpportunityId/coverLetter (API) or
// projectId/pitch (sent by the Apply modal). One of each pair is required.
export const createApplicationSchema = z.object({
  body: z.object({
    projectOpportunityId: z.string().trim().min(1).optional(),
    projectId: z.string().trim().min(1).optional(),
    coverLetter: coverLetterField.optional(),
    pitch: coverLetterField.optional(),
    resumeSnapshot: z.string().url('Resume must be a valid URL').optional().nullable(),
    resumeUrl: z.string().url('Resume must be a valid URL').max(2048).optional().nullable(),
    githubSnapshot: z.string().url('GitHub URL must be valid').optional().nullable(),
    githubUrl: z.string().url('GitHub URL must be valid').max(2048).optional().nullable(),
    portfolioSnapshot: z.string().url('Portfolio URL must be valid').optional().nullable(),
    skills: z.array(z.string().trim().max(50)).max(50).optional(),
  })
    .refine((body) => Boolean(body.projectOpportunityId || body.projectId), {
      path: ['projectId'],
      message: 'Project ID is required',
    })
    .refine((body) => Boolean(body.coverLetter || body.pitch), {
      path: ['pitch'],
      message: 'Cover letter is required',
    }),
});

export const updateApplicationStatusSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    status: z.enum([
      'Applied',
      'Under Review',
      'Shortlisted',
      'Interview Scheduled',
      'Selected',
      'Rejected',
      'Withdrawn',
      'applied',
      'shortlisted',
      'selected',
      'rejected',
    ]),
    recruiterNotes: z.string().trim().max(2000).optional(),
    feedback: z.string().optional(),
  }),
});

export const scheduleInterviewSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    interviewDate: z.string({ required_error: 'Interview date/time is required' }),
    interviewMode: z.enum(['Online', 'In-person'], {
      required_error: 'Interview mode must be Online or In-person',
    }),
    recruiterNotes: z.string().trim().max(2000).optional(),
  }),
});

export const selectCandidateSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    recruiterNotes: z.string().trim().max(2000).optional(),
  }),
});
