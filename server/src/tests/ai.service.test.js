/**
 * Tests for ai.service.js — skill extraction and skill gap analysis
 *
 * All tests mock:
 *  - global fetch (the HTTP client)
 *  - Mongoose model methods (no real DB connection required)
 *
 * Environment variables required before dynamic import:
 *  - JWT_SECRET, JWT_REFRESH_SECRET, MONGODB_URI (set in beforeAll)
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

// ── env stubs ────────────────────────────────────────────────────────────────
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.AI_SERVICE_URL = 'http://localhost:8000';
  process.env.AI_SERVICE_TIMEOUT_MS = '5000';
});

// ── helpers ──────────────────────────────────────────────────────────────────

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
}

// ── extractSkills (raw HTTP call) ────────────────────────────────────────────

describe('extractSkills()', () => {
  let extractSkills;

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch(200, {
      success: true,
      data: {
        studentId: 'student-001',
        skills: [
          {
            name: 'React',
            canonicalName: 'react',
            category: 'frontend',
            sources: ['project', 'resume'],
            evidence: ['Project: VidyaLink', 'Resume: Technical Skills'],
            evidenceCount: 2,
            confidence: 0.85,
          },
          {
            name: 'Node.js',
            canonicalName: 'node.js',
            category: 'backend',
            sources: ['project'],
            evidence: ['Project: VidyaLink'],
            evidenceCount: 1,
            confidence: 0.55,
          },
        ],
        totalSkillsCount: 2,
        generatedAt: new Date().toISOString(),
        version: '1.0',
      },
    }));

    const mod = await import('../services/ai.service.js');
    extractSkills = mod.extractSkills;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('returns parsed skill extraction result on success', async () => {
    const payload = {
      studentId: 'student-001',
      portfolioId: 'portfolio-001',
      verificationStatus: 'VERIFIED',
      resume: { text: 'React Node.js' },
      projects: [{ title: 'VidyaLink', technologies: ['React', 'Node.js'] }],
      certificates: [],
      github: { languages: ['JavaScript'] },
      endorsements: [],
    };

    const result = await extractSkills(payload);

    expect(result.success).toBe(true);
    expect(result.data.skills).toHaveLength(2);
    expect(result.data.skills[0].canonicalName).toBe('react');
    expect(result.data.skills[0].confidence).toBe(0.85);
  });

  it('throws badRequest on 422 validation error from AI service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 422,
      ok: false,
      json: async () => ({ detail: 'verificationStatus must be VERIFIED' }),
    }));

    const mod = await import('../services/ai.service.js');
    const freshExtract = mod.extractSkills;

    await expect(
      freshExtract({ studentId: '', portfolioId: 'p1', verificationStatus: 'PENDING' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws serviceUnavailable on 503 from AI service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 503,
      ok: false,
      json: async () => ({}),
    }));

    const mod = await import('../services/ai.service.js');
    const freshExtract = mod.extractSkills;

    await expect(
      freshExtract({ studentId: 's1', portfolioId: 'p1', verificationStatus: 'VERIFIED' })
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it('throws gatewayTimeout on AbortError', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const mod = await import('../services/ai.service.js');
    const freshExtract = mod.extractSkills;

    await expect(
      freshExtract({ studentId: 's1', portfolioId: 'p1', verificationStatus: 'VERIFIED' })
    ).rejects.toMatchObject({ statusCode: 504 });
  });
});

// ── analyzeSkillGap (raw HTTP call) ──────────────────────────────────────────

describe('analyzeSkillGap()', () => {
  let analyzeSkillGap;

  beforeEach(async () => {
    vi.stubGlobal('fetch', mockFetch(200, {
      success: true,
      data: {
        targetRole: 'Full Stack Developer',
        matchedSkills: [
          { name: 'React', canonicalName: 'react', confidence: 0.85, sources: ['project', 'resume'], isRequired: true },
          { name: 'Node.js', canonicalName: 'node.js', confidence: 0.55, sources: ['project'], isRequired: true },
        ],
        missingRequiredSkills: ['MongoDB'],
        missingPreferredSkills: ['Docker'],
        weakEvidenceSkills: [
          { name: 'Node.js', canonicalName: 'node.js', confidence: 0.55, reason: 'Single source or low evidence breadth' },
        ],
        matchPercentage: 66.7,
        analysisVersion: '1.0',
        analyzedAt: new Date().toISOString(),
      },
    }));

    const mod = await import('../services/ai.service.js');
    analyzeSkillGap = mod.analyzeSkillGap;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('returns structured gap analysis result', async () => {
    const payload = {
      studentId: 'student-001',
      skills: [
        { name: 'React', canonicalName: 'react', confidence: 0.85, sources: ['project', 'resume'] },
        { name: 'Node.js', canonicalName: 'node.js', confidence: 0.55, sources: ['project'] },
      ],
      targetRole: {
        title: 'Full Stack Developer',
        requiredSkills: ['React', 'Node.js', 'MongoDB'],
        preferredSkills: ['Docker'],
      },
    };

    const result = await analyzeSkillGap(payload);

    expect(result.success).toBe(true);
    expect(result.data.targetRole).toBe('Full Stack Developer');
    expect(result.data.matchedSkills).toHaveLength(2);
    expect(result.data.missingRequiredSkills).toContain('MongoDB');
    expect(result.data.missingPreferredSkills).toContain('Docker');
    expect(result.data.weakEvidenceSkills).toHaveLength(1);
    expect(result.data.matchPercentage).toBeCloseTo(66.7, 1);
  });

  it('correctly reflects empty student skills as all-missing', async () => {
    vi.stubGlobal('fetch', mockFetch(200, {
      success: true,
      data: {
        targetRole: 'Backend Developer',
        matchedSkills: [],
        missingRequiredSkills: ['Node.js', 'PostgreSQL'],
        missingPreferredSkills: ['Docker'],
        weakEvidenceSkills: [],
        matchPercentage: 0,
        analysisVersion: '1.0',
        analyzedAt: new Date().toISOString(),
      },
    }));

    const mod = await import('../services/ai.service.js');
    const freshGap = mod.analyzeSkillGap;

    const result = await freshGap({
      studentId: 'student-002',
      skills: [],
      targetRole: {
        title: 'Backend Developer',
        requiredSkills: ['Node.js', 'PostgreSQL'],
        preferredSkills: ['Docker'],
      },
    });

    expect(result.data.matchedSkills).toHaveLength(0);
    expect(result.data.missingRequiredSkills).toContain('Node.js');
    expect(result.data.matchPercentage).toBe(0);
  });

  it('throws serviceUnavailable when AI service is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const mod = await import('../services/ai.service.js');
    const freshGap = mod.analyzeSkillGap;

    await expect(
      freshGap({ studentId: 's1', skills: [], targetRole: { title: 'Dev', requiredSkills: [], preferredSkills: [] } })
    ).rejects.toMatchObject({ statusCode: 503 });
  });
});
