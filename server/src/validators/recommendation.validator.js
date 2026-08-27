import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid recommendation ID');
const safeString = z.string().trim().min(1).max(100);

// The browser may send this established request shape, but recommendation
// inputs are rebuilt from MongoDB in the service.  These fields are never used
// for scoring so a student cannot manipulate a recommendation.
const trustedSnapshotRequest = z.object({
  studentId: objectId,
  skills: z.array(safeString).max(100).optional(),
  skillGaps: z.array(safeString).max(100).optional(),
  projects: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
  interests: z.array(safeString).max(100).optional(),
  domains: z.array(safeString).max(100).optional(),
  portfolioScore: z.number().min(0).max(100).optional(),
  atsScore: z.number().min(0).max(100).optional(),
  githubScore: z.number().min(0).max(100).optional(),
}).strict();

export const recommendationRequestSchema = z.object({ body: trustedSnapshotRequest });

export const refreshRecommendationSchema = z.object({
  body: z.object({
    scopes: z.array(z.enum(['ALUMNI', 'RECRUITERS', 'IMPROVEMENTS'])).min(1).max(3).optional(),
  }).strict(),
});

export const recommendationActionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({}).strict(),
});
