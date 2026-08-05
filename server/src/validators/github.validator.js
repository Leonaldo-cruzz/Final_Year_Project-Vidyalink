import { z } from 'zod';

export const githubUsernamePattern = /^(?!-)[A-Za-z\d](?:[A-Za-z\d-]{0,37}[A-Za-z\d])?$/;

export const githubUsernameSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().replace(/^@/, '') : value),
  z.string({ required_error: 'GitHub username is required' })
    .min(1, 'GitHub username is required')
    .max(39, 'GitHub username must not exceed 39 characters')
    .regex(githubUsernamePattern, 'Enter a valid GitHub username')
);

export const connectGithubSchema = z.object({
  body: z.object({
    githubUsername: githubUsernameSchema,
  }),
});
