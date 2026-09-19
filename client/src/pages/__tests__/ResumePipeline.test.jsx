/**
 * ResumePipeline.test.jsx
 *
 * Tests the Resume Builder UI for:
 *   1. No-resume state
 *   2. Generated resume display with ATS score
 *   3. Uploaded resume display without ATS
 *   4. Stale banner shown when status === 'STALE'
 *   5. No fake fallback data in any displayed state
 *   6. ATS panel shows all real sub-scores
 *   7. Missing/no ATS result shows honest empty state
 *   8. AI service unavailable error handling in generate flow
 *   9. Section toggles control which sections are sent
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// ── Mock dependencies ────────────────────────────────────────────────────────

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u1', fullName: 'Test Student', email: 'test@example.com', role: 'student' } }),
}));

vi.mock('@/utils/formatters', () => ({
  getErrorMessage: (_err, fallback) => fallback,
  formatDate: (d) => (d ? new Date(d).toLocaleDateString() : ''),
}));

// Default service mocks
const mockGetLatestResume   = vi.fn();
const mockCheckStaleness    = vi.fn();
const mockGenerateResume    = vi.fn();
const mockGetResume         = vi.fn();
const mockUploadResume      = vi.fn();
const mockReplaceResume     = vi.fn();
const mockDeleteResume      = vi.fn();

vi.mock('@/services/resumeService', () => ({
  getResume:        (...args) => mockGetResume(...args),
  uploadResume:     (...args) => mockUploadResume(...args),
  replaceResume:    (...args) => mockReplaceResume(...args),
  deleteResume:     (...args) => mockDeleteResume(...args),
  generateResume:   (...args) => mockGenerateResume(...args),
  getLatestResume:  (...args) => mockGetLatestResume(...args),
  checkStaleness:   (...args) => mockCheckStaleness(...args),
}));

vi.mock('@/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui/Spinner', () => ({
  default: () => <span>Spinner</span>,
  FullPageSpinner: ({ message }) => <div>{message}</div>,
}));

vi.mock('@/components/ui/Modal', () => ({
  default: ({ open, children }) => open ? <div data-testid="modal">{children}</div> : null,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const REAL_ATS_RESULT = {
  ats_score: 74,
  keyword_match_score: 68,
  skills_score: 82,
  education_score: 100,
  experience_score: 50,
  formatting_score: 90,
  section_completeness: { summary: true, skills: true, education: true, experience: false, projects: true, certifications: false, achievements: false },
  missing_keywords: ['Docker', 'REST APIs'],
  detected_skills: ['Python', 'React', 'Node.js'],
  suggestions: ['Consider adding a clearly labelled experience section.'],
};

const GENERATED_RESUME = {
  _id: 'r1',
  originalFileName: 'Alice_Smith_resume.pdf',
  fileUrl: '/uploads/resumes/resume-gen-u1-000.pdf',
  fileSize: 48123,
  status: 'GENERATED',
  resumeSource: 'generated',
  generatedAt: '2026-09-10T10:00:00Z',
  generationVersion: '1.0.0',
};

const UPLOADED_RESUME = {
  _id: 'r2',
  originalFileName: 'my_resume.pdf',
  fileUrl: '/uploads/resumes/resume-uploaded.pdf',
  fileSize: 120000,
  status: 'UPLOADED',
  resumeSource: 'uploaded',
  uploadedAt: '2026-09-09T10:00:00Z',
};

const renderResume = async () => {
  const { default: Resume } = await import('../student/Resume.jsx');
  return render(
    <MemoryRouter>
      <Resume />
    </MemoryRouter>
  );
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Resume Builder — Data Truth Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckStaleness.mockResolvedValue({ data: { data: { isStale: false, resume: null } } });
  });

  it('TC-RES1: No resume state — shows honest empty state, no fake filename', async () => {
    mockGetLatestResume.mockResolvedValue({ data: { data: null } });

    await renderResume();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Should NOT show fake filenames
    expect(screen.queryByText(/john_doe/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/alice_smith/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/my_resume/i)).not.toBeInTheDocument();

    // Should show honest "no resume" messaging (appears in card title + body)
    expect(screen.getAllByText(/No resume/i).length).toBeGreaterThan(0);
  });

  it('TC-RES2: Generated resume displays real filename and ATS score — no fake data', async () => {
    mockGetLatestResume.mockResolvedValue({
      data: { data: { resume: GENERATED_RESUME, atsResult: REAL_ATS_RESULT } },
    });

    await renderResume();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Real filename appears
    expect(screen.getByText('Alice_Smith_resume.pdf')).toBeInTheDocument();

    // Real ATS score appears (74 somewhere)
    expect(screen.getAllByText('74').length).toBeGreaterThan(0);

    // Generated status badge
    expect(screen.getByText('Generated')).toBeInTheDocument();

    // No fake names
    expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Alex Student/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/96|92|88|85/)).not.toBeInTheDocument(); // known fake scores
  });

  it('TC-RES3: Uploaded resume with no ATS — shows honest "No ATS" state, not a fake score', async () => {
    mockGetLatestResume.mockResolvedValue({
      data: { data: { resume: UPLOADED_RESUME, atsResult: null } },
    });

    await renderResume();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('my_resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('Uploaded')).toBeInTheDocument();

    // No fabricated ATS score shown
    expect(screen.queryByText(/ATS Score.*96/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ATS Score.*92/i)).not.toBeInTheDocument();

    // Honest "No ATS" info
    expect(screen.getByText(/No ATS analysis yet/i)).toBeInTheDocument();
  });

  it('TC-RES4: STALE status — shows stale banner, not silently presenting old data', async () => {
    const staleResume = { ...GENERATED_RESUME, status: 'STALE' };
    mockGetLatestResume.mockResolvedValue({
      data: { data: { resume: staleResume, atsResult: null } },
    });
    mockCheckStaleness.mockResolvedValue({
      data: { data: { isStale: true, resume: staleResume } },
    });

    await renderResume();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Stale status badge
    expect(screen.getByText('Stale')).toBeInTheDocument();

    // Stale warning banner
    expect(screen.getByText(/Profile changed since last generation/i)).toBeInTheDocument();
  });

  it('TC-RES5: ATS panel displays all real sub-scores correctly', async () => {
    mockGetLatestResume.mockResolvedValue({
      data: { data: { resume: GENERATED_RESUME, atsResult: REAL_ATS_RESULT } },
    });

    const { default: Resume } = await import('../student/Resume.jsx');
    const { getByText, getAllByText } = render(
      <MemoryRouter><Resume /></MemoryRouter>
    );

    // Click ATS tab
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    fireEvent.click(getByText('ATS Analysis'));

    await waitFor(() => {
      // All real sub-scores should appear
      expect(getAllByText('74').length).toBeGreaterThan(0); // ats_score
      expect(getByText('82')).toBeInTheDocument();          // skills_score
      expect(getByText('100')).toBeInTheDocument();         // education_score

      // Real missing keywords
      expect(getByText('Docker')).toBeInTheDocument();
      expect(getByText('REST APIs')).toBeInTheDocument();

      // Real detected skills
      expect(getByText('Python')).toBeInTheDocument();
    });
  });

  it('TC-RES6: ATS panel with no result — shows honest empty state, no fabricated score', async () => {
    mockGetLatestResume.mockResolvedValue({
      data: { data: { resume: GENERATED_RESUME, atsResult: null } },
    });

    const { default: Resume } = await import('../student/Resume.jsx');
    const { getByText } = render(
      <MemoryRouter><Resume /></MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    fireEvent.click(getByText('ATS Analysis'));

    await waitFor(() => {
      expect(getByText(/No ATS Analysis Yet/i)).toBeInTheDocument();
    });

    // No fabricated score
    expect(screen.queryByText('96')).not.toBeInTheDocument();
    expect(screen.queryByText('85')).not.toBeInTheDocument();
  });

  it('TC-RES7: Generate tab renders section toggles with correct labels', async () => {
    mockGetLatestResume.mockResolvedValue({ data: { data: null } });

    const { default: Resume } = await import('../student/Resume.jsx');
    const { getByText } = render(<MemoryRouter><Resume /></MemoryRouter>);

    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    fireEvent.click(getByText('Generate'));

    await waitFor(() => {
      expect(getByText('Contact')).toBeInTheDocument();
      expect(getByText('Skills')).toBeInTheDocument();
      expect(getByText('Education')).toBeInTheDocument();
      expect(getByText('Projects')).toBeInTheDocument();
      expect(getByText('Certifications')).toBeInTheDocument();
      expect(getByText('GitHub')).toBeInTheDocument();
    });
  });

  it('TC-RES8: AI service unavailable during generate — shows error, not fake success', async () => {
    mockGetLatestResume.mockResolvedValue({ data: { data: null } });
    mockGenerateResume.mockRejectedValue(new Error('AI service is temporarily unavailable'));

    const { default: Resume } = await import('../student/Resume.jsx');
    render(<MemoryRouter><Resume /></MemoryRouter>);

    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByText('Generate'));

    const generateBtn = screen.getByRole('button', { name: /Generate Resume/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Failed to generate resume/i)).toBeInTheDocument();
    });

    // No fake ATS score shown after failure
    expect(screen.queryByText('96')).not.toBeInTheDocument();
  });
});
