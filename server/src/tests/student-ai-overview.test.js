/* global setTimeout */

import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

import aiController from '../controllers/ai.controller.js';
import aiResultsService from '../services/aiResults.service.js';
import { readinessQuerySchema } from '../validators/readiness.validator.js';

const responseFor = () => {
  let body;
  const response = {
    status() { return response; },
    json(value) { body = value; return value; },
  };
  return { response, getBody: () => body };
};

afterEach(() => mock.restoreAll());

test('student AI overview uses the authenticated identity and returns the dashboard contract', async () => {
  const summary = {
    portfolioScore: { score: 84 },
    atsScore: null,
    githubAnalytics: null,
    skills: [{ name: 'React' }],
    skillGaps: null,
    recommendations: [],
    industryReadiness: { score: 82.25 },
  };
  let requestedStudentId;
  mock.method(aiResultsService, 'getPortfolioAISummary', async (studentId) => {
    requestedStudentId = studentId;
    return summary;
  });

  const { response, getBody } = responseFor();
  let handlerError;
  aiController.getStudentAIOverview(
    { user: { _id: 'authenticated-student' }, query: { studentId: 'another-student' } },
    response,
    (error) => { handlerError = error; },
  );
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(handlerError, undefined);
  assert.equal(requestedStudentId, 'authenticated-student');
  assert.deepEqual(getBody().data, summary);
  assert.equal(Object.prototype.hasOwnProperty.call(getBody().data, 'studentId'), false);
});

test('student AI overview query validation rejects a client-supplied student id', () => {
  const result = readinessQuerySchema.safeParse({
    body: {},
    query: { studentId: 'another-student' },
    params: {},
  });
  assert.equal(result.success, false);
});
