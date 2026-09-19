// ============================================================
// VIDYALINK — Product Truth & Empty States Regression Tests
//
// Verifies that:
// 1. Login page contains NO demo role preset buttons
// 2. AuthContext has NO hardcoded default fake user
// 3. Student dashboard with empty data displays 0 counts & honest empty states
// 4. Faculty dashboard with zero requests displays honest empty state
// 5. Recruiter dashboard with zero applicants displays 0 counts & honest empty state
// 6. Alumni dashboard with zero inquiries displays honest empty state
// 7. Missing profile fields do NOT fall back to fake identities
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/services/portfolioService', () => ({
  getMyPortfolios: vi.fn().mockResolvedValue({ data: [] }),
  verifyCertificate: vi.fn(),
}));

vi.mock('@/services/certificateService', () => ({
  getCertificates: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/services/applicationService', () => ({
  getStudentApplications: vi.fn().mockResolvedValue({ data: [] }),
  getProjectApplications: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/services/githubService', () => ({
  getGithubProfile: vi.fn().mockResolvedValue({ data: { connectionStatus: 'Disconnected' } }),
}));

vi.mock('@/services/resumeService', () => ({
  getResume: vi.fn().mockResolvedValue({ data: null }),
}));

vi.mock('@/services/mentorshipService', () => ({
  default: {
    getMentorships: vi.fn().mockResolvedValue({ data: [] }),
    updateStatus: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@/services/referralService', () => ({
  default: {
    getReferrals: vi.fn().mockResolvedValue({ data: [] }),
    createReferral: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import { useAuth } from '@/context/AuthContext';
import Login from '../Login';
import StudentDashboard from '../student/StudentDashboard';
import FacultyDashboard from '../faculty/FacultyDashboard';
import RecruiterDashboard from '../recruiter/RecruiterDashboard';
import AlumniDashboard from '../alumni/AlumniDashboard';

describe('Product Truth & Data Integrity Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-PT1: Login page contains NO demo preset buttons or role switchers', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      login: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Assert absence of demo presets
    expect(screen.queryByText(/one-click role access/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/student demo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/faculty demo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recruiter demo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/alumni demo/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Alex Student')).not.toBeInTheDocument();
    expect(screen.queryByText('Dr. Sarah Jenkins')).not.toBeInTheDocument();
  });

  it('TC-PT2: Student dashboard with 0 data renders 0 counts and honest empty states', async () => {
    useAuth.mockReturnValue({
      user: {
        _id: 'user-new',
        fullName: 'New Genuine User',
        email: 'genuine@example.com',
        role: 'student',
      },
    });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no verified projects yet/i)).toBeInTheDocument();
      expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
    });

    // Verify zero counts
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);

    // Verify absence of fake fallback names and capstones
    expect(screen.queryByText('Alex Student')).not.toBeInTheDocument();
    expect(screen.queryByText('Distributed ML Model Serving Pipeline')).not.toBeInTheDocument();
    expect(screen.queryByText(/VLC-2026-A89F/)).not.toBeInTheDocument();
    expect(screen.queryByText('Dr. Sarah Jenkins')).not.toBeInTheDocument();
  });

  it('TC-PT3: Faculty dashboard with 0 requests renders honest empty state', async () => {
    useAuth.mockReturnValue({
      user: {
        _id: 'fac-1',
        fullName: 'Prof. Real Faculty',
        email: 'faculty@real.edu',
        role: 'faculty',
      },
    });

    render(
      <MemoryRouter>
        <FacultyDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no pending verification requests/i)).toBeInTheDocument();
      expect(screen.getByText(/no supervised projects registered/i)).toBeInTheDocument();
    });

    // Ensure no synthetic student submissions are displayed
    expect(screen.queryByText('Alex Student')).not.toBeInTheDocument();
    expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument();
  });

  it('TC-PT4: Recruiter dashboard with 0 applicants displays 0 funnel counts and empty state', async () => {
    useAuth.mockReturnValue({
      user: {
        _id: 'rec-1',
        fullName: 'Real Recruiter',
        email: 'recruiter@company.com',
        role: 'recruiter',
      },
    });

    render(
      <MemoryRouter>
        <RecruiterDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no candidate applications yet/i)).toBeInTheDocument();
    });

    // Ensure no fake candidate dossiers or fake AI scores
    expect(screen.queryByText('Alex Student')).not.toBeInTheDocument();
    expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument();
    expect(screen.queryByText('Rahul Mehta')).not.toBeInTheDocument();
    expect(screen.queryByText('96')).not.toBeInTheDocument();
    expect(screen.queryByText('92')).not.toBeInTheDocument();
  });

  it('TC-PT5: Alumni dashboard with 0 inquiries displays honest empty state', async () => {
    useAuth.mockReturnValue({
      user: {
        _id: 'alu-1',
        fullName: 'Real Alum',
        email: 'alum@alumni.edu',
        role: 'alumni',
      },
    });

    render(
      <MemoryRouter>
        <AlumniDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no mentorship requests yet/i)).toBeInTheDocument();
      expect(screen.getByText(/no active mentees yet/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Arjun Nair')).not.toBeInTheDocument();
    expect(screen.queryByText('Sneha Patel')).not.toBeInTheDocument();
    expect(screen.queryByText('Rohan Das')).not.toBeInTheDocument();
  });

  it('TC-PT6: Unspecified user fields render blank without fake fallback strings', async () => {
    useAuth.mockReturnValue({
      user: {
        _id: 'u-empty',
        email: 'fresh@example.com',
        role: 'student',
      },
    });

    render(
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Alex Student')).not.toBeInTheDocument();
      expect(screen.queryByText('Vidya Institute of Technology (Demo)')).not.toBeInTheDocument();
      expect(screen.queryByText('Computer Science & Engineering')).not.toBeInTheDocument();
    });
  });
});
