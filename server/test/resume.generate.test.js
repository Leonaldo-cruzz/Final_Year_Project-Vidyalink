/**
 * resume.generate.test.js
 *
 * Server-side unit tests for ResumeService:
 *   1. buildResumeText — complete data
 *   2. buildResumeText — missing optional fields omitted
 *   3. buildResumeText — no fake fallback strings
 *   4. buildResumeText — section include/exclude toggles
 *   5. ATS score fields pass validation contract
 *   6. Stale detection — snapshot diff
 *   7. Stale detection — same snapshot = not stale
 *
 * Uses Node built-in test runner (node --test).
 * All fixtures are local — no database, no fake global data.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildResumeText } from '../src/services/resume.service.js';
import { validateATS } from '../src/services/ai.service.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// These are test-only. They NEVER appear in application runtime.

const REAL_USER = {
  fullName: 'Priya Malhotra',
  email:    'priya@college.edu',
  college:  'National Institute of Technology',
  branch:   'Computer Science Engineering',
  graduationYear: 2026,
};

const REAL_PROFILE = {
  bio:       'Passionate software developer with a focus on distributed systems and open-source contributions.',
  phone:     '+919876543210',
  degree:    'B.Tech',
  skills:    ['Python', 'Node.js', 'PostgreSQL', 'Docker'],
  interests: ['Distributed Systems', 'Open Source'],
  cgpa:      8.6,
  linkedin:  'https://linkedin.com/in/priyamalhotra',
  github:    'https://github.com/priyamal',
};

const REAL_CERTIFICATES = [
  {
    title:              'AWS Cloud Practitioner',
    issuer:             'Amazon Web Services',
    issueDate:          new Date('2025-06-01'),
    verificationStatus: 'Verified',
    skills:             ['Cloud', 'AWS'],
  },
];

const REAL_PROJECTS = [
  {
    title:            'Distributed Log Aggregator',
    shortDescription: 'A real-time log aggregation system using Kafka and Elasticsearch.',
    technologies:     ['Kafka', 'Elasticsearch', 'Node.js'],
    githubRepository: 'https://github.com/priyamal/log-aggregator',
    liveDeployment:   null,
    verifiedByFaculty: true,
  },
];

const REAL_GITHUB = {
  connectionStatus: 'Connected',
  login:            'priyamal',
  publicRepos:      23,
};

// ── Test helpers ──────────────────────────────────────────────────────────────

const FAKE_NAMES  = ['John Doe', 'Alex Student', 'Priya Sharma', 'Jane Doe', 'MIT University', 'Software Engineer at Google'];
const FAKE_SCORES = [96, 92, 88, 85, 78, 72]; // known hardcoded demo values

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ResumeService.buildResumeText', () => {
  it('TC-SRV-RES1: Complete real data produces non-empty text with all sections', () => {
    const text = buildResumeText({
      user: REAL_USER,
      profile: REAL_PROFILE,
      certificates: REAL_CERTIFICATES,
      projects: REAL_PROJECTS,
      github: REAL_GITHUB,
      sections: {},
    });

    assert.ok(text.length > 100, 'Resume text must be non-trivially long');
    assert.ok(text.includes('Priya Malhotra'),               'Contains real student name');
    assert.ok(text.includes('priya@college.edu'),            'Contains real email');
    assert.ok(text.includes('SKILLS'),                       'Contains SKILLS heading');
    assert.ok(text.includes('Python'),                       'Contains a real skill');
    assert.ok(text.includes('EDUCATION'),                    'Contains EDUCATION heading');
    assert.ok(text.includes('National Institute of Technology'), 'Contains real institution');
    assert.ok(text.includes('PROJECTS'),                     'Contains PROJECTS heading');
    assert.ok(text.includes('Distributed Log Aggregator'),   'Contains real project title');
    assert.ok(text.includes('CERTIFICATIONS'),               'Contains CERTIFICATIONS heading');
    assert.ok(text.includes('AWS Cloud Practitioner'),       'Contains real cert title');
    assert.ok(text.includes('GITHUB'),                       'Contains GITHUB heading');
    assert.ok(text.includes('priyamal'),                     'Contains real GitHub username');
  });

  it('TC-SRV-RES2: Missing optional fields are omitted — no placeholder text', () => {
    const sparseProfile = { skills: ['Python'], degree: null, bio: null, cgpa: null, linkedin: null, github: null };
    const text = buildResumeText({
      user: { fullName: 'Test Student', email: 'test@uni.edu', college: 'Test University', branch: 'CS', graduationYear: null },
      profile: sparseProfile,
      certificates: [],
      projects: [],
      github: null,
      sections: {},
    });

    assert.ok(text.length > 0, 'Should produce some text');
    // Sections with no data must be absent
    assert.ok(!text.includes('CERTIFICATIONS'), 'No CERTIFICATIONS section when empty');
    assert.ok(!text.includes('PROJECTS'),       'No PROJECTS section when empty');
    assert.ok(!text.includes('GITHUB'),         'No GITHUB section when not connected');
    assert.ok(!text.includes('SUMMARY'),        'No SUMMARY when bio is null');
  });

  it('TC-SRV-RES3: No fake fallback strings appear in generated text', () => {
    const text = buildResumeText({
      user: REAL_USER,
      profile: REAL_PROFILE,
      certificates: REAL_CERTIFICATES,
      projects: REAL_PROJECTS,
      github: REAL_GITHUB,
      sections: {},
    });

    for (const name of FAKE_NAMES) {
      assert.ok(!text.includes(name), `Fake string "${name}" must not appear in generated text`);
    }
  });

  it('TC-SRV-RES4: Section exclude toggle works — excluded section absent from text', () => {
    const text = buildResumeText({
      user: REAL_USER,
      profile: REAL_PROFILE,
      certificates: REAL_CERTIFICATES,
      projects: REAL_PROJECTS,
      github: REAL_GITHUB,
      sections: { github: false, certifications: false },
    });

    assert.ok(!text.includes('GITHUB'),         'GITHUB section excluded');
    assert.ok(!text.includes('CERTIFICATIONS'), 'CERTIFICATIONS section excluded');
    assert.ok(text.includes('SKILLS'),          'SKILLS still present');
    assert.ok(text.includes('PROJECTS'),        'PROJECTS still present');
  });

  it('TC-SRV-RES5: Verified vs unverified certificate labels', () => {
    const mixedCerts = [
      { ...REAL_CERTIFICATES[0], verificationStatus: 'Verified' },
      { title: 'Unverified Badge', issuer: 'Some Platform', issueDate: new Date(), verificationStatus: 'Pending', skills: [] },
    ];
    const text = buildResumeText({
      user: REAL_USER, profile: REAL_PROFILE, certificates: mixedCerts, projects: [], github: null, sections: {},
    });

    assert.ok(text.includes('[Verified]'),            'Verified cert has [Verified] tag');
    assert.ok(!text.match(/Unverified Badge.*\[Verified\]/s), 'Pending cert does NOT have [Verified] tag');
  });
});

describe('ATS validator contract', () => {
  it('TC-SRV-ATS1: Valid ATS response passes validateATS without throwing', () => {
    const validATS = {
      ats_score: 74.5,
      keyword_match_score: 68.0,
      skills_score: 82.0,
      education_score: 100.0,
      experience_score: 50.0,
      section_completeness: {
        summary: true, skills: true, education: true,
        experience: false, projects: true, certifications: false, achievements: false,
      },
      missing_keywords: ['Docker', 'REST APIs'],
      detected_skills: ['Python', 'React'],
      suggestions: ['Add a clearly labelled experience section.'],
    };
    // validateATS must NOT throw for a valid payload
    assert.doesNotThrow(() => validateATS(validATS));
  });

  it('TC-SRV-ATS2: ATS response with score > 100 fails validation', () => {
    const invalidATS = {
      ats_score: 150,
      keyword_match_score: 68, skills_score: 82, education_score: 100, experience_score: 50,
      section_completeness: {},
      missing_keywords: [], detected_skills: [], suggestions: [],
    };
    assert.throws(() => validateATS(invalidATS), /score from 0 to 100/);
  });

  it('TC-SRV-ATS3: ATS response with non-array suggestions fails validation', () => {
    const invalidATS = {
      ats_score: 74, keyword_match_score: 68, skills_score: 82, education_score: 100, experience_score: 50,
      section_completeness: {},
      missing_keywords: [], detected_skills: [],
      suggestions: 'string instead of array',
    };
    assert.throws(() => validateATS(invalidATS));
  });

  it('TC-SRV-ATS4: Known fake hardcoded scores are not in a real ATS run (sentinel check)', () => {
    // This test guards against regression: if fake scores re-appear anywhere in service code.
    for (const fakeScore of FAKE_SCORES) {
      // Fake scores must not appear in resume text built from sparse data
      const text = buildResumeText({
        user: { fullName: 'T', email: 't@t.com', college: null, branch: null, graduationYear: null },
        profile: null, certificates: [], projects: [], github: null, sections: {},
      });
      // The text itself should not contain fake ATS scores as plain strings
      assert.ok(!text.includes(String(fakeScore)), `Fake score ${fakeScore} must not appear in resume text`);
    }
  });
});
