/* global AbortController, clearTimeout, fetch, setTimeout */

import { z } from 'zod';

import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const AI_REQUEST_TIMEOUT_MS = 8_000;

const recommendationSchema = z.object({
  entityId: z.string().min(1).max(200),
  type: z.enum([
    'ALUMNI_MENTOR',
    'RECRUITER_OPPORTUNITY',
    'SKILL_IMPROVEMENT',
    'PROJECT_IMPROVEMENT',
    'RESUME_IMPROVEMENT',
  ]),
  matchScore: z.number().min(0).max(100),
  reasons: z.array(z.string().min(1).max(500)).min(1).max(30),
  matchedSkills: z.array(z.string().min(1).max(200)).max(30),
  missingSkills: z.array(z.string().min(1).max(200)).max(30),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  algorithmVersion: z.literal('1.0'),
  generatedAt: z.string().min(1),
}).strict();

const recommendationResponseSchema = z.object({
  recommendations: z.array(recommendationSchema),
}).strict();

class AIService {
  async requestRecommendation(path, payload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.AI_SERVICE_API_KEY && { 'X-AI-Service-Key': env.AI_SERVICE_API_KEY }),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw ApiError.serviceUnavailable('Recommendation engine is temporarily unavailable');
      }

      const result = recommendationResponseSchema.safeParse(await response.json());
      if (!result.success) {
        throw ApiError.internal('Recommendation engine returned an invalid response');
      }

      return result.data.recommendations;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error.name === 'AbortError') {
        throw ApiError.serviceUnavailable('Recommendation engine request timed out');
      }
      throw ApiError.serviceUnavailable('Unable to connect to the recommendation engine');
    } finally {
      clearTimeout(timeout);
    }
  }

  getAlumniRecommendations(student, candidates) {
    return this.requestRecommendation('/recommendations/alumni', { student, candidates });
  }

  getRecruiterRecommendations(student, opportunities) {
    return this.requestRecommendation('/recommendations/recruiters', { student, opportunities });
  }

  getImprovementRecommendations(student) {
    return this.requestRecommendation('/recommendations/improvements', { student });
  }
}

export default new AIService();
