import assert from 'node:assert/strict';
import { test } from 'node:test';
import { candidateSearchSchema } from '../validators/candidate.validator.js';
import { createInterviewSchema } from '../validators/interview.validator.js';
import { createShortlistSchema } from '../validators/shortlist.validator.js';

test('candidate search accepts recruiter filter and sort contract', () => {
  const result = candidateSearchSchema.safeParse({
    query: {
      page: '2',
      limit: '12',
      search: 'frontend',
      skills: 'React, TypeScript',
      branch: 'Computer Science',
      graduationYear: '2027',
      college: 'Vidya Institute',
      domain: 'web',
      verificationStatus: 'Verified',
      minPortfolioScore: '70',
      maxPortfolioScore: '95',
      sortBy: 'recentlyUpdated',
      sortOrder: 'desc',
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.data.query.page, 2);
  assert.equal(result.data.query.minPortfolioScore, 70);
});

test('shortlist contract requires a valid student id and allows notes', () => {
  const result = createShortlistSchema.safeParse({
    body: {
      studentId: '507f1f77bcf86cd799439011',
      notes: 'Strong verified project evidence',
    },
  });

  assert.equal(result.success, true);
});

test('interview contract requires future time and mode-specific location data', () => {
  const result = createInterviewSchema.safeParse({
    body: {
      studentId: '507f1f77bcf86cd799439011',
      title: 'Frontend interview',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      durationMinutes: 45,
      mode: 'ONLINE',
      meetingUrl: 'https://meet.example.com/vidyalink',
    },
  });

  assert.equal(result.success, true);
});

