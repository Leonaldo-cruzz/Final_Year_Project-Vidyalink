/**
 * AIInsightsPanelStates.test.jsx
 *
 * Frontend tests for the AIInsights page covering:
 * 1. Loading state renders spinner
 * 2. NOT_EVALUATED status renders correct copy
 * 3. COMPLETED status with full data renders portfolio score, readiness, component breakdown
 * 4. STALE status shows stale warning banner
 * 5. No recommendations renders empty state copy
 * 6. ATS unavailable shows honest empty state
 * 7. GitHub unavailable shows honest empty state
 * 8. Error state renders error message
 *
 * These tests use jsdom and React Testing Library patterns.
 * They do NOT use fake runtime scores — test fixtures are test-only.
 */

import React from 'react';
import { describe, beforeEach, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AIInsights from '../student/AIInsights';


// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
const mockGetAIResults = vi.fn();
const mockGetRecommendations = vi.fn();

vi.mock('@/services/aiService', () => ({
  getAIResults: (...args) => mockGetAIResults(...args),
  getRecommendations: (...args) => mockGetRecommendations(...args),
  runAIEvaluation: vi.fn(),
  analyzeSkillGap: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u1', role: 'student', fullName: 'Test Student' } }),
}));

vi.mock('@/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/ui/Card', () => ({
  SectionCard: ({ title, children }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, loading }) => (
    <button onClick={onClick} disabled={loading}>{children}</button>
  ),
}));

vi.mock('@/components/ui/Badge', () => ({
  default: ({ children }) => <span>{children}</span>,
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
const FULL_AI_PROFILE = {
  status: 'COMPLETED',
  lastUpdated: '2026-09-14T10:00:00Z',
  evaluationVersion: 3,
  stale: false,
  dataCompleteness: {
    availableComponents: ['portfolio', 'ats', 'github'],
    verifiedPortfolio: true,
  },
  evaluation: {
    overallScore: 78,
    category: 'Good',
    componentScores: {
      complexity: 80,
      technology_stack: 75,
      github_activity: 70,
      documentation_quality: 65,
      innovation: 72,
      code_quality: 68,
    },
    weightedBreakdown: {
      complexity: 20,
      technology_stack: 15,
      github_activity: 10.5,
      documentation_quality: 9.75,
      innovation: 10.8,
      code_quality: 6.8,
    },
    evidence: {
      complexity: ['Multi-component architecture detected.'],
      technology_stack: ['React, Node.js, Python identified.'],
    },
    strengths: ['Solid tech stack.', 'Good project structure.'],
    improvements: ['Add more documentation.'],
  },
  readiness: {
    readiness_score: 82,
    category: 'Good',
    next_steps: ['Complete a capstone project.'],
    strengths: [],
    gaps: [],
  },
  ats: {
    ats_score: 68,
    keyword_match_score: 60,
    skills_score: 71,
    education_score: 85,
    experience_score: 55,
    missing_keywords: ['Docker', 'Kubernetes'],
    suggestions: ['Add quantified achievements.', 'Include certifications.'],
    section_completeness: { summary: true, experience: true },
  },
  github: {
    derived_activity_score: 65,
    factual_metrics: { public_repos: 12, recent_activity: true },
    observations: ['12 public repositories.', 'Recent commit activity detected.'],
  },
  skills: {
    detected_skills: ['React', 'Node.js', 'Python'],
    skill_sources: {},
  },
  history: [
    { evaluationVersion: 2, createdAt: '2026-09-10T10:00:00Z', overallScore: 74, readinessScore: 68, evaluationStatus: 'COMPLETED' },
  ],
};

const wrap = (data) => ({ data: { data } });

const renderPage = () =>
  render(
    <MemoryRouter>
      <AIInsights />
    </MemoryRouter>
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AIInsights page states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecommendations.mockResolvedValue(wrap({ alumni: [], opportunities: [], skills_to_develop: [] }));
  });

  // TC-AI-01: loading spinner
  test('TC-AI-01: renders loading spinner while data is fetching', () => {
    // Never resolve to keep loading state
    mockGetAIResults.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByLabelText(/loading ai results/i)).toBeInTheDocument();
  });

  // TC-AI-02: NOT_EVALUATED status
  test('TC-AI-02: NOT_EVALUATED status shows correct copy', async () => {
    mockGetAIResults.mockResolvedValue(wrap({ status: 'NOT_EVALUATED', dataCompleteness: {} }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/not evaluated yet/i)).toBeInTheDocument();
      expect(screen.getByText(/run the pipeline after faculty verification/i)).toBeInTheDocument();
    });
  });

  // TC-AI-03: COMPLETED status with full data
  test('TC-AI-03: COMPLETED status renders portfolio score, readiness score, and component breakdown', async () => {
    mockGetAIResults.mockResolvedValue(wrap(FULL_AI_PROFILE));
    renderPage();
    await waitFor(() => {
      // Evaluation score
      expect(screen.getByText(/78\/100/)).toBeInTheDocument();
      // Readiness score
      expect(screen.getByText(/82\/100/)).toBeInTheDocument();
      // Component breakdown title
      expect(screen.getByText(/portfolio evidence breakdown/i)).toBeInTheDocument();
      // Component labels from COMPONENT_META
      expect(screen.getByText('Project Complexity')).toBeInTheDocument();
      expect(screen.getByText('Technology Stack')).toBeInTheDocument();
      expect(screen.getByText('Documentation Quality')).toBeInTheDocument();
    });
  });

  // TC-AI-04: STALE status shows warning banner
  test('TC-AI-04: STALE status shows stale warning banner', async () => {
    mockGetAIResults.mockResolvedValue(wrap({
      ...FULL_AI_PROFILE,
      status: 'STALE',
      stale: true,
    }));
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/portfolio changed since last evaluation/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/re-evaluate to refresh/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  // TC-AI-05: No recommendations returns honest empty state
  test('TC-AI-05: no recommendations shows empty state copy', async () => {
    mockGetAIResults.mockResolvedValue(wrap({ ...FULL_AI_PROFILE }));
    mockGetRecommendations.mockResolvedValue(wrap({ alumni: [], opportunities: [], skills_to_develop: [] }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no matching alumni found/i)).toBeInTheDocument();
      expect(screen.getByText(/no matching opportunities available/i)).toBeInTheDocument();
    });
  });

  // TC-AI-06: ATS unavailable shows honest empty state
  test('TC-AI-06: ATS unavailable shows honest empty state message', async () => {
    const noAts = { ...FULL_AI_PROFILE, ats: null };
    mockGetAIResults.mockResolvedValue(wrap(noAts));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/ats analysis requires a stored resume/i)).toBeInTheDocument();
    });
  });

  // TC-AI-07: GitHub unavailable shows honest empty state
  test('TC-AI-07: GitHub unavailable shows honest empty state message', async () => {
    const noGitHub = { ...FULL_AI_PROFILE, github: null };
    mockGetAIResults.mockResolvedValue(wrap(noGitHub));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/github analytics requires a connected github account/i)).toBeInTheDocument();
    });
  });

  // TC-AI-08: Error state renders error message
  test('TC-AI-08: API error renders user-friendly error message', async () => {
    mockGetAIResults.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // TC-AI-09: Component scores come from DB, never recalculated client-side
  test('TC-AI-09: component scores displayed are exactly the values from the API response', async () => {
    mockGetAIResults.mockResolvedValue(wrap(FULL_AI_PROFILE));
    renderPage();
    await waitFor(() => {
      // complexity score from fixture is 80
      expect(screen.getByText('80/100')).toBeInTheDocument();
      // technology_stack score from fixture is 75
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });
  });

  // TC-AI-10: Evaluation history renders stored versions
  test('TC-AI-10: evaluation history table renders stored version rows', async () => {
    mockGetAIResults.mockResolvedValue(wrap(FULL_AI_PROFILE));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Evaluation history')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
    });
  });
});
