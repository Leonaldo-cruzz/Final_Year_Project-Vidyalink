import { z } from 'zod';

export const updatePortfolioVisibilitySchema = z.object({
  body: z.object({
    isPublic: z.boolean({ required_error: 'isPublic must be a boolean' }),
  }),
});
