import { z } from 'zod';

export const createApplicationSchema = z.object({
  body: z.object({
    projectOpportunityId: z.string({ required_error: 'Project ID is required' }).or(z.string()),
    projectId: z.string().optional(),
    coverLetter: z
      .string({ required_error: 'Cover letter is required' })
      .trim()
      .min(10, 'Cover letter must be at least 10 characters')
      .max(3000, 'Cover letter must not exceed 3000 characters')
      .or(z.string()),
    pitch: z.string().optional(),
    resumeSnapshot: z.string().url('Resume must be a valid URL').optional().nullable(),
    resumeUrl: z.string().optional().nullable(),
    githubSnapshot: z.string().url('GitHub URL must be valid').optional().nullable(),
    githubUrl: z.string().optional().nullable(),
    portfolioSnapshot: z.string().url('Portfolio URL must be valid').optional().nullable(),
    skills: z.array(z.string().trim().max(50)).optional(),
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
