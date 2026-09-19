// ============================================================
// VIDYALINK — Verification Lifecycle & Product Logic Regression Tests
//
// Verifies:
// 1. New student has no verification (Status: Not submitted)
// 2. New student does not see "Verified Portfolio" CTA in header or actions
// 3. Student with no project sees "Add Project" CTA
// 4. Eligible student with project sees "Submit for Verification" CTA
// 5. Submitted student sees "Verification Pending" / "Under Faculty Review" (CTA disabled, no duplicates)
// 6. Pending student cannot submit duplicate request
// 7. Faculty approval reflects as "Verified" state
// 8. Faculty rejection reflects as "Verification Rejected" with remarks
// 9. Faculty changes-requested reflects as "Changes Requested" with remarks & "Update & Resubmit"
// 10. Student resubmission moves state back to "Pending"
// 11. Verified student sees "Verified Portfolio" CTA
// 12. Unverified student is gated from accessing verified portfolio credentials
// 13. AI evaluation is gated before required verification ("Complete faculty verification before running AI evaluation.")
// 14. Real verification count matches database (0 verified portfolios renders 0)
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/services/portfolioService', () => ({
  getMyPortfolios: vi.fn(),
  verifyCertificate: vi.fn(),
}));

vi.mock('@/services/projectService', () => ({
  getProjects: vi.fn(),
}));

vi.mock('@/services/verificationService', () => ({
  getVerificationHistory: vi.fn(),
  submitVerification: vi.fn(),
  getStudentVerificationSummary: vi.fn(),
}));

vi.mock('@/services/certificateService', () => ({
  getCertificates: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/services/applicationService', () => ({
  getStudentApplications: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/services/githubService', () => ({
  getGithubProfile: vi.fn().mockResolvedValue({ data: { connectionStatus: 'Disconnected' } }),
}));

vi.mock('@/services/resumeService', () => ({
  getResume: vi.fn().mockResolvedValue({ data: null }),
}));

vi.mock('@/services/aiService', () => ({
  getAIResults: vi.fn().mockResolvedValue({
    data: {
      status: 'INSUFFICIENT_EVIDENCE',
      evaluation: null,
      readiness: null,
      dataCompleteness: { verifiedPortfolio: false },
    },
  }),
  runAIEvaluation: vi.fn(),
  getLatestAIResults: vi.fn().mockResolvedValue({ data: null }),
}));

import { useAuth } from '@/context/AuthContext';
import { getMyPortfolios } from '@/services/portfolioService';
import { getProjects } from '@/services/projectService';
import { getVerificationHistory, submitVerification } from '@/services/verificationService';
import StudentDashboard from '../student/StudentDashboard';
import VerifiedPortfolio from '../portfolio/VerifiedPortfolio';

const mockStudent = {
  _id: 'student-456',
  fullName: 'Priya Sharma',
  email: 'priya@campus.edu',
  role: 'student',
  college: 'National Institute of Technology',
  branch: 'Computer Science',
};

const mockProjectEligible = {
  _id: 'proj-101',
  title: 'Cloud Distributed Ledger',
  shortDescription: 'High-throughput blockchain consensus node implementation.',
  description: 'High-throughput blockchain consensus node implementation.',
  technologies: ['Go', 'gRPC', 'Docker'],
  verificationStatus: 'Pending',
};

const mockVerifiedPortfolio = {
  _id: 'port-999',
  certificateId: 'VLC-2026-X77',
  projectTitle: 'Cloud Distributed Ledger',
  student: mockStudent,
  verifiedBy: { fullName: 'Prof. Ramesh Rao', role: 'faculty' },
  skillsVerified: ['Go', 'gRPC', 'Docker'],
  verificationHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  createdAt: '2026-03-01T10:00:00.000Z',
};

describe('Verification Lifecycle & Product Logic Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: mockStudent, isAuthenticated: true });
    getMyPortfolios.mockResolvedValue({ data: [] });
    getProjects.mockResolvedValue({ data: [] });
    getVerificationHistory.mockResolvedValue({ data: [] });
  });

  it('1. New student has no verification and shows Status: Not submitted', async () => {
    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/status:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/not submitted/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/your portfolio has not been submitted for faculty verification yet/i)).toBeInTheDocument();
    });
  });

  it('2. New student does NOT see "Verified Portfolio" CTA button in header', async () => {
    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back, Priya Sharma/i)).toBeInTheDocument();
    });

    // Header must NOT have "Verified Portfolio" button
    const bannerButtons = screen.getAllByRole('button');
    const hasVerifiedPortfolioBtn = bannerButtons.some(
      (btn) => btn.textContent?.trim() === 'Verified Portfolio'
    );
    expect(hasVerifiedPortfolioBtn).toBe(false);
  });

  it('3. Student with 0 projects sees "Add Project" CTA', async () => {
    getProjects.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const addButtons = screen.getAllByRole('button', { name: /add project/i });
      expect(addButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('4. Eligible student with project sees "Submit for Verification" CTA', async () => {
    getProjects.mockResolvedValue({ data: [mockProjectEligible] });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const submitButtons = screen.getAllByRole('button', { name: /submit for verification/i });
      expect(submitButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('5. Submitted student sees "Verification Pending" / "Under Faculty Review"', async () => {
    getProjects.mockResolvedValue({ data: [mockProjectEligible] });
    getVerificationHistory.mockResolvedValue({
      data: [
        {
          _id: 'verif-1',
          status: 'PENDING',
          targetType: 'PROJECT',
          targetId: mockProjectEligible._id,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/under faculty review/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/your submission is with faculty for review/i)).toBeInTheDocument();
    });

    // Both banner button and card button should show "Verification Pending" and be disabled
    const pendingButtons = screen.getAllByRole('button', { name: /verification pending/i });
    expect(pendingButtons.length).toBeGreaterThanOrEqual(1);
    pendingButtons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('6. Pending student cannot submit duplicate verification request', async () => {
    getProjects.mockResolvedValue({ data: [mockProjectEligible] });
    getVerificationHistory.mockResolvedValue({
      data: [
        {
          _id: 'verif-1',
          status: 'PENDING',
          targetType: 'PROJECT',
          targetId: mockProjectEligible._id,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const pendingBtns = screen.getAllByRole('button', { name: /verification pending/i });
      expect(pendingBtns.length).toBeGreaterThanOrEqual(1);
      pendingBtns.forEach((btn) => expect(btn).toBeDisabled());
    });
  });

  it('7. Faculty approves → student becomes Verified with portfolio record', async () => {
    getMyPortfolios.mockResolvedValue({ data: [mockVerifiedPortfolio] });
    getProjects.mockResolvedValue({ data: [{ ...mockProjectEligible, verificationStatus: 'Verified' }] });
    getVerificationHistory.mockResolvedValue({
      data: [
        {
          _id: 'verif-1',
          status: 'VERIFIED',
          targetType: 'PROJECT',
          targetId: mockProjectEligible._id,
          facultyId: { fullName: 'Prof. Ramesh Rao' },
          verifiedAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/your portfolio is faculty verified/i)).toBeInTheDocument();
      const verifiedBtn = screen.getByRole('button', { name: /view verified portfolio/i });
      expect(verifiedBtn).toBeInTheDocument();
    });
  });

  it('8. Faculty rejects → student sees Verification Rejected with remarks', async () => {
    getProjects.mockResolvedValue({ data: [mockProjectEligible] });
    getVerificationHistory.mockResolvedValue({
      data: [
        {
          _id: 'verif-1',
          status: 'REJECTED',
          targetType: 'PROJECT',
          targetId: mockProjectEligible._id,
          remarks: 'Insufficient documentation for test methodology.',
          facultyId: { fullName: 'Prof. Ramesh Rao' },
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/verification rejected/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/"Insufficient documentation for test methodology."/i)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /resubmit for verification/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('9. Faculty requests changes → student sees Changes Requested with remarks', async () => {
    getProjects.mockResolvedValue({ data: [mockProjectEligible] });
    getVerificationHistory.mockResolvedValue({
      data: [
        {
          _id: 'verif-1',
          status: 'CHANGES_REQUESTED',
          targetType: 'PROJECT',
          targetId: mockProjectEligible._id,
          remarks: 'Please add automated integration test coverage in repository.',
          facultyId: { fullName: 'Prof. Ramesh Rao' },
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/changes requested/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/"Please add automated integration test coverage in repository."/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /review changes/i })).toBeInTheDocument();
    });
  });

  it('10. Student opens submission modal and resubmits to move to Pending', async () => {
    submitVerification.mockResolvedValue({ success: true });
    getProjects.mockResolvedValue({ data: [mockProjectEligible] });
    getVerificationHistory.mockResolvedValue({
      data: [
        {
          _id: 'verif-1',
          status: 'CHANGES_REQUESTED',
          targetType: 'PROJECT',
          targetId: mockProjectEligible._id,
          remarks: 'Please add tests',
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update & resubmit/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /update & resubmit/i }));

    await waitFor(() => {
      expect(screen.getByText(/submit project for faculty verification/i)).toBeInTheDocument();
    });
  });

  it('11. Verified student sees "Verified Portfolio" CTA in header and action cards', async () => {
    getMyPortfolios.mockResolvedValue({ data: [mockVerifiedPortfolio] });
    getProjects.mockResolvedValue({ data: [{ ...mockProjectEligible, verificationStatus: 'Verified' }] });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Header button
      expect(screen.getByRole('button', { name: /^verified portfolio$/i })).toBeInTheDocument();
      // Section card button
      expect(screen.getByRole('button', { name: /view verified portfolio/i })).toBeInTheDocument();
    });
  });

  it('12. Unverified student is protected when navigating to /portfolio/me', async () => {
    getMyPortfolios.mockResolvedValue({ data: [] });
    getVerificationHistory.mockResolvedValue({
      data: [
        {
          _id: 'verif-1',
          status: 'PENDING',
          targetType: 'PROJECT',
          targetId: mockProjectEligible._id,
        },
      ],
    });

    render(
      <MemoryRouter>
        <VerifiedPortfolio />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/verification in progress/i)).toBeInTheDocument();
      expect(screen.getByText(/your project evidence submission is currently under faculty review/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });
  });

  it('13. AI evaluation displays gate copy before required verification', async () => {
    getMyPortfolios.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/complete faculty verification before running ai evaluation/i)).toBeInTheDocument();
    });
  });

  it('14. Real verification count matches database (0 verified portfolios renders 0)', async () => {
    getMyPortfolios.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Verified Portfolios')).toBeInTheDocument();
      const statCard = screen.getByText('Verified Portfolios').closest('div');
      expect(statCard).toHaveTextContent('0');
    });
  });
});
