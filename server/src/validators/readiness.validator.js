import { z } from 'zod';

const portfolioIdField = z.string().trim().min(1, 'Portfolio ID must not be empty').optional();

const emptyBody = z.object({}).strict().optional();

export const readinessQuerySchema = z.object({
  body: emptyBody,
  query: z.object({ portfolioId: portfolioIdField }).strict(),
  params: z.object({}).strict(),
});

export const readinessRefreshSchema = z.object({
  body: z.object({ portfolioId: portfolioIdField }).strict().optional(),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

