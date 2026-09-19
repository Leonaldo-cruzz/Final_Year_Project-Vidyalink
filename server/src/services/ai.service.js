/* global AbortController, clearTimeout, fetch, setTimeout */

import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const PORTFOLIO_COMPONENTS = [
  'complexity',
  'technology_stack',
  'github_activity',
  'documentation_quality',
  'innovation',
  'code_quality',
];
const CATEGORIES = ['Excellent', 'Very Good', 'Good', 'Average', 'Needs Improvement'];

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const assertRecord = (value, operation) => {
  if (!isRecord(value)) {
    throw new Error(`${operation} response must be a JSON object`);
  }
  return value;
};

const assertArray = (value, field, operation) => {
  if (!Array.isArray(value)) {
    throw new Error(`${operation} response field ${field} must be an array`);
  }
};

const assertScore = (value, field, operation) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${operation} response field ${field} must be a score from 0 to 100`);
  }
};

const validatePortfolioEvaluation = (payload) => {
  const data = assertRecord(payload, 'Portfolio evaluation');
  assertScore(data.overall_score, 'overall_score', 'Portfolio evaluation');
  if (!CATEGORIES.includes(data.category)) throw new Error('Portfolio evaluation category is invalid');
  for (const component of PORTFOLIO_COMPONENTS) {
    assertScore(data.component_scores?.[component], `component_scores.${component}`, 'Portfolio evaluation');
    assertScore(data.weighted_breakdown?.[component], `weighted_breakdown.${component}`, 'Portfolio evaluation');
  }
  assertRecord(data.evidence, 'Portfolio evaluation evidence');
  for (const [component, evidence] of Object.entries(data.evidence)) {
    assertArray(evidence, `evidence.${component}`, 'Portfolio evaluation');
  }
  assertArray(data.strengths, 'strengths', 'Portfolio evaluation');
  assertArray(data.improvements || data.improvement_suggestions, 'improvements', 'Portfolio evaluation');
  assertRecord(data.data_completeness, 'Portfolio evaluation data_completeness');
  if (data.project_evaluations !== undefined) {
    assertArray(data.project_evaluations, 'project_evaluations', 'Portfolio evaluation');
  }
  return data;
};

const validateATS = (payload) => {
  const data = assertRecord(payload, 'ATS analysis');
  ['ats_score', 'keyword_match_score', 'skills_score', 'education_score', 'experience_score'].forEach(
    (field) => assertScore(data[field], field, 'ATS analysis')
  );
  assertRecord(data.section_completeness, 'ATS analysis section_completeness');
  ['missing_keywords', 'suggestions', 'detected_skills'].forEach((field) => assertArray(data[field], field, 'ATS analysis'));
  return data;
};

const validateSkills = (payload) => {
  const data = assertRecord(payload, 'Skill extraction');
  assertArray(data.detected_skills, 'detected_skills', 'Skill extraction');
  assertRecord(data.skill_sources, 'Skill extraction skill_sources');
  return data;
};

const validateSkillGap = (payload) => {
  const data = assertRecord(payload, 'Skill gap');
  ['required_skills', 'matched_skills', 'missing_skills', 'recommendations'].forEach(
    (field) => assertArray(data[field], field, 'Skill gap')
  );
  if (typeof data.coverage_percentage !== 'number' || data.coverage_percentage < 0 || data.coverage_percentage > 100) {
    throw new Error('Skill gap coverage_percentage must be from 0 to 100');
  }
  return data;
};

const validateGithub = (payload) => {
  const data = assertRecord(payload, 'GitHub analysis');
  assertRecord(data.factual_metrics, 'GitHub analysis factual_metrics');
  assertScore(data.derived_activity_score ?? data.derived_score, 'derived_activity_score', 'GitHub analysis');
  assertArray(data.observations || data.explanation, 'observations', 'GitHub analysis');
  return data;
};

const validateReadiness = (payload) => {
  const data = assertRecord(payload, 'Readiness analysis');
  assertScore(data.readiness_score, 'readiness_score', 'Readiness analysis');
  if (!CATEGORIES.includes(data.category) && data.category !== 'Insufficient Evidence') {
    throw new Error('Readiness category is invalid');
  }
  assertRecord(data.component_scores, 'Readiness component_scores');
  for (const [component, score] of Object.entries(data.component_scores)) {
    if (score !== null) assertScore(score, `component_scores.${component}`, 'Readiness analysis');
  }
  assertArray(data.strengths, 'strengths', 'Readiness analysis');
  assertArray(data.gaps, 'gaps', 'Readiness analysis');
  assertArray(data.next_steps || data.recommended_next_steps, 'next_steps', 'Readiness analysis');
  return data;
};

const validateRecommendations = (payload) => {
  const data = assertRecord(payload, 'Recommendations');
  data.alumni_mentors = data.alumni_mentors || data.alumni || [];
  data.alumni = data.alumni || data.alumni_mentors;
  data.recruiter_opportunities = data.recruiter_opportunities || data.opportunities || [];
  data.opportunities = data.opportunities || data.recruiter_opportunities;
  data.skills_to_develop = data.skills_to_develop || data.skills || [];
  data.skills = data.skills || data.skills_to_develop;
  data.notes = data.notes || [];

  ['alumni_mentors', 'recruiter_opportunities', 'skills_to_develop', 'notes'].forEach(
    (field) => assertArray(data[field], field, 'Recommendations')
  );
  for (const item of [...data.alumni_mentors, ...data.recruiter_opportunities]) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.reason !== 'string') {
      throw new Error('Recommendation items must include id, name, and reason');
    }
    const score = item.match_score !== undefined ? item.match_score : item.matchScore;
    assertScore(score, 'match_score', 'Recommendations');
  }
  return data;
};

class AIServiceClient {
  constructor({ baseUrl = env.AI_SERVICE_URL, timeoutMs = env.AI_SERVICE_TIMEOUT } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  async request(path, { method = 'GET', body, validate } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const startMs = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const elapsedMs = Date.now() - startMs;
      console.info(`[AI_OBSERVABILITY] UPSTREAM ${method} ${path} status=${response.status} durationMs=${elapsedMs}`);

      const text = await response.text();
      let payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          throw ApiError.badGateway('AI service returned malformed JSON');
        }
      }

      if (!response.ok) {
        throw ApiError.badGateway(`AI service rejected the request (${response.status})`, [
          { field: 'aiService', message: 'The upstream AI service did not accept the request' },
        ]);
      }

      try {
        return validate ? validate(payload) : payload;
      } catch (error) {
        throw ApiError.badGateway(`AI service returned an invalid ${error.message}`);
      }
    } catch (error) {
      const elapsedMs = Date.now() - startMs;
      console.warn(`[AI_OBSERVABILITY] UPSTREAM_ERROR ${method} ${path} durationMs=${elapsedMs} error="${error.message}"`);
      if (error instanceof ApiError) throw error;
      if (error.name === 'AbortError') {
        throw ApiError.gatewayTimeout('AI service request timed out');
      }
      throw ApiError.serviceUnavailable('AI service is temporarily unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  async health() {
    try {
      const data = await this.request('/health');
      return { available: data?.status === 'ok', data };
    } catch (error) {
      return { available: false, statusCode: error.statusCode || 503, message: error.message };
    }
  }

  evaluatePortfolio(payload) {
    return this.request('/api/v1/portfolio/evaluate', {
      method: 'POST',
      body: payload,
      validate: validatePortfolioEvaluation,
    });
  }

  verifyDeployment(payload) {
    return this.request('/api/v1/portfolio/verify-deployment', {
      method: 'POST',
      body: payload,
    });
  }

  analyzeATS(payload) {
    return this.request('/api/v1/ats/analyze', {
      method: 'POST',
      body: payload,
      validate: validateATS,
    });
  }

  extractSkills(payload) {
    return this.request('/api/v1/skills/extract', {
      method: 'POST',
      body: payload,
      validate: validateSkills,
    });
  }

  analyzeSkillGap(payload) {
    return this.request('/api/v1/skills/gap', {
      method: 'POST',
      body: payload,
      validate: validateSkillGap,
    });
  }

  analyzeGithub(payload) {
    return this.request('/api/v1/github/analyze', {
      method: 'POST',
      body: payload,
      validate: validateGithub,
    });
  }

  calculateReadiness(payload) {
    return this.request('/api/v1/portfolio/readiness', {
      method: 'POST',
      body: payload,
      validate: validateReadiness,
    });
  }

  getRecommendations(payload) {
    return this.request('/api/v1/recommendations', {
      method: 'POST',
      body: payload,
      validate: validateRecommendations,
    });
  }
}

export {
  AIServiceClient,
  PORTFOLIO_COMPONENTS,
  validatePortfolioEvaluation,
  validateATS,
  validateSkills,
  validateSkillGap,
  validateGithub,
  validateReadiness,
  validateRecommendations,
};

export default new AIServiceClient();
