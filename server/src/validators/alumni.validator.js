import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? null : value),
  z.string().trim().url('Must be a valid URL').max(2048).nullable().optional()
);

const alumniProfileBodySchema = z.object({
  company: z.string({ required_error: 'Company is required' }).trim().min(2, 'Company name must be at least 2 characters').max(150),
  designation: z.string({ required_error: 'Designation is required' }).trim().min(2, 'Designation must be at least 2 characters').max(150),
  industry: z.string({ required_error: 'Industry is required' }).trim().min(2, 'Industry must be at least 2 characters').max(100),
  experience: z.number().min(0).max(70).optional(),
  experienceSummary: z.string().trim().max(1000).optional(),
  skills: z.array(z.string().trim().min(1)).optional(),
  bio: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(150).optional(),
  linkedin: optionalUrl,
  github: optionalUrl,
  companyWebsite: optionalUrl,
  mentorshipAvailable: z.boolean().optional(),
  mockInterviewsAvailable: z.boolean().optional(),
  referralsAvailable: z.boolean().optional(),
});

const updateAlumniProfileBodySchema = alumniProfileBodySchema.partial();

const mentorshipRequestBodySchema = z.object({
  alumniId: z.string({ required_error: 'Alumni ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid alumni ID'),
  topic: z.string({ required_error: 'Topic is required' }).trim().min(3, 'Topic must be at least 3 characters').max(200),
  message: z.string({ required_error: 'Message is required' }).trim().min(10, 'Message must be at least 10 characters').max(2000),
  goals: z.array(z.string().trim()).optional(),
});

const mentorshipActionBodySchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});

const mentorshipCompleteBodySchema = z.object({
  notes: z.string().trim().max(2000).optional(),
  feedback: z.object({
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().trim().max(1000).optional(),
  }).optional(),
});

const endorsementBodySchema = z.object({
  studentId: z.string({ required_error: 'Student ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid student ID'),
  skill: z.string({ required_error: 'Skill is required' }).trim().min(1, 'Skill name is required').max(100),
  message: z.string().trim().max(1000).optional(),
});

const mockInterviewRequestBodySchema = z.object({
  alumniId: z.string({ required_error: 'Alumni ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid alumni ID'),
  roleTarget: z.string({ required_error: 'Role target is required' }).trim().min(2, 'Role target is required').max(150),
  mode: z.enum(['ONLINE', 'OFFLINE']).optional(),
  scheduledDate: z.string().or(z.date()).optional(),
  durationMinutes: z.number().min(15).max(180).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const mockInterviewScheduleBodySchema = z.object({
  scheduledDate: z.string({ required_error: 'Scheduled date is required' }).or(z.date()),
  mode: z.enum(['ONLINE', 'OFFLINE']).optional(),
  meetingLink: z.string().trim().max(2048).optional(),
  location: z.string().trim().max(250).optional(),
  durationMinutes: z.number().min(15).max(180).optional(),
});

const mockInterviewFeedbackBodySchema = z.object({
  feedback: z.object({
    rating: z.number().min(1).max(5),
    technicalSkills: z.string().trim().max(1000).optional(),
    communication: z.string().trim().max(1000).optional(),
    strengths: z.array(z.string()).optional(),
    improvements: z.array(z.string()).optional(),
    detailedSummary: z.string().trim().max(2000).optional(),
  }),
});

const createReferralBodySchema = z.object({
  studentId: z.string({ required_error: 'Student ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid student ID'),
  company: z.string({ required_error: 'Company name is required' }).trim().min(2, 'Company name required').max(150),
  jobTitle: z.string({ required_error: 'Job title is required' }).trim().min(2, 'Job title required').max(150),
  jobUrl: z.string().trim().max(2048).optional(),
  message: z.string().trim().max(2000).optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REFERRED', 'REJECTED', 'CLOSED']).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
});

const updateReferralBodySchema = createReferralBodySchema.partial();

// Export Wrapped Schemas conforming to validate middleware { body, query, params }
export const alumniProfileSchema = z.object({ body: alumniProfileBodySchema });
export const updateAlumniProfileSchema = z.object({ body: updateAlumniProfileBodySchema });
export const mentorshipRequestSchema = z.object({ body: mentorshipRequestBodySchema });
export const mentorshipActionSchema = z.object({ body: mentorshipActionBodySchema.optional() });
export const mentorshipCompleteSchema = z.object({ body: mentorshipCompleteBodySchema.optional() });
export const endorsementSchema = z.object({ body: endorsementBodySchema });
export const mockInterviewRequestSchema = z.object({ body: mockInterviewRequestBodySchema });
export const mockInterviewScheduleSchema = z.object({ body: mockInterviewScheduleBodySchema });
export const mockInterviewFeedbackSchema = z.object({ body: mockInterviewFeedbackBodySchema });
export const createReferralSchema = z.object({ body: createReferralBodySchema });
export const updateReferralSchema = z.object({ body: updateReferralBodySchema.optional() });
