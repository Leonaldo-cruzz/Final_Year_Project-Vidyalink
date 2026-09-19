// ============================================================
// VIDYALINK — Projects Page Data Truth & Empty State Tests
//
// Verifies:
// 1. Loading state renders skeleton and NEVER prematurely shows empty state
// 2. Zero projects renders honest empty state: "0 projects", "Your portfolio is empty",
//    "Add your first project to start building your professional portfolio.", and "Create your first project"
// 3. One project renders "1 project", project title, and hides empty state/create first project
// 4. Multiple projects renders "5 projects" and all project cards
// 5. Count formatting (0 projects, 1 project, 5 projects) is dynamic and not hardcoded
// 6. "+ Add Project" button remains visible across zero, one, and many project states
// 7. Search operates on actual project data and passes query to API
// 8. API error renders "Unable to load your projects." with "Retry", and does NOT show "0 projects" or empty state
// 9. Missing optional fields are omitted without fake fallback strings
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { _id: 'student-123', fullName: 'Real Student', role: 'student' },
    isAuthenticated: true,
  })),
}));

vi.mock('@/services/projectService', () => ({
  getProjects: vi.fn(),
  deleteProject: vi.fn(),
  updateProject: vi.fn(),
}));

import { getProjects } from '@/services/projectService';
import Projects from '../projects/Projects';

const mockProjectSingle = {
  _id: 'proj-001',
  title: 'Smart Campus IoT Hub',
  shortDescription: 'Real-time telemetry aggregation for university sensors.',
  technologies: ['React', 'Node.js', 'MQTT', 'TypeScript'],
  verificationStatus: 'Verified',
  projectStatus: 'Completed',
  category: 'Internet of Things',
  githubRepository: 'https://github.com/student/iot-hub',
  liveDeployment: 'https://iot-hub.campus.edu',
  featured: false,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-10T12:00:00.000Z',
};

const mockMultipleProjects = [
  mockProjectSingle,
  {
    _id: 'proj-002',
    title: 'Autonomous Rover Vision',
    shortDescription: 'Obstacle avoidance using OpenCV.',
    technologies: ['Python', 'OpenCV', 'ROS2'],
    verificationStatus: 'Pending',
    projectStatus: 'In Progress',
    category: 'Robotics',
    featured: true,
    createdAt: '2026-02-15T09:00:00.000Z',
  },
  {
    _id: 'proj-003',
    title: 'Blockchain Credential Ledger',
    shortDescription: 'Tamper-proof academic diploma verification.',
    technologies: ['Solidity', 'Ethereum', 'Web3.js'],
    verificationStatus: 'Verified',
    projectStatus: 'Completed',
    category: 'Cryptography',
    createdAt: '2026-01-20T11:00:00.000Z',
  },
  {
    _id: 'proj-004',
    title: 'Clinical Trial Data Pipeline',
    shortDescription: 'HIPAA compliant ETL pipeline.',
    technologies: ['Apache Kafka', 'PostgreSQL', 'Go'],
    verificationStatus: 'Pending',
    projectStatus: 'In Progress',
    category: 'Data Engineering',
    createdAt: '2026-01-10T08:00:00.000Z',
  },
  {
    _id: 'proj-005',
    title: 'Adaptive Learning Mobile App',
    shortDescription: 'Personalized study schedule generator.',
    technologies: ['Flutter', 'Firebase', 'Dart'],
    verificationStatus: 'Verified',
    projectStatus: 'Completed',
    category: 'Mobile Development',
    createdAt: '2026-01-05T14:00:00.000Z',
  },
];

describe('Projects Page — Data Truth & State Integrity Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-PROJ1: Loading state renders skeleton and NEVER prematurely shows empty state', async () => {
    // Unresolved promise simulates in-flight network request
    let resolvePromise;
    getProjects.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    );

    // Skeleton is displayed during loading
    expect(screen.getByTestId('projects-loading')).toBeInTheDocument();

    // Critical: Empty state and "0 projects" MUST NOT appear while loading
    expect(screen.queryByText(/your portfolio is empty/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/create your first project/i)).not.toBeInTheDocument();
    expect(screen.queryByText('0 projects')).not.toBeInTheDocument();

    // Resolve with empty array
    resolvePromise({ data: [] });

    await waitFor(() => {
      expect(screen.queryByTestId('projects-loading')).not.toBeInTheDocument();
      expect(screen.getByText(/your portfolio is empty/i)).toBeInTheDocument();
    });
  });

  it('TC-PROJ2: Zero projects renders honest empty state and correct count', async () => {
    getProjects.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('0 projects')).toBeInTheDocument();
      expect(screen.getByText('Your portfolio is empty')).toBeInTheDocument();
      expect(
        screen.getByText('Add your first project to start building your professional portfolio.')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create your first project/i })
      ).toBeInTheDocument();
    });

    // Top-right "+ Add Project" button remains visible
    expect(screen.getByRole('button', { name: /add project/i })).toBeInTheDocument();

    // Assert no fake projects or demo identities exist
    expect(screen.queryByText('Smart Campus IoT Hub')).not.toBeInTheDocument();
    expect(screen.queryByText('Distributed ML Model Serving Pipeline')).not.toBeInTheDocument();
  });

  it('TC-PROJ3: One project renders "1 project" and actual record, hiding empty state', async () => {
    getProjects.mockResolvedValue({ data: [mockProjectSingle] });

    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1 project')).toBeInTheDocument();
      expect(screen.getByText('Smart Campus IoT Hub')).toBeInTheDocument();
    });

    // Singular count verified — "1 projects" must NOT appear
    expect(screen.queryByText('1 projects')).not.toBeInTheDocument();

    // Empty state elements MUST NOT appear
    expect(screen.queryByText(/your portfolio is empty/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/create your first project/i)).not.toBeInTheDocument();

    // Top-right "+ Add Project" button remains visible
    expect(screen.getByRole('button', { name: /add project/i })).toBeInTheDocument();
  });

  it('TC-PROJ4: Multiple projects renders "5 projects" and all project cards', async () => {
    getProjects.mockResolvedValue({ data: mockMultipleProjects });

    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('5 projects')).toBeInTheDocument();
    });

    // All real project records are rendered
    expect(screen.getByText('Smart Campus IoT Hub')).toBeInTheDocument();
    expect(screen.getByText('Autonomous Rover Vision')).toBeInTheDocument();
    expect(screen.getByText('Blockchain Credential Ledger')).toBeInTheDocument();
    expect(screen.getByText('Clinical Trial Data Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Adaptive Learning Mobile App')).toBeInTheDocument();

    // Empty state MUST NOT appear
    expect(screen.queryByText(/your portfolio is empty/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/create your first project/i)).not.toBeInTheDocument();

    // Top-right Add Project button remains visible
    expect(screen.getByRole('button', { name: /add project/i })).toBeInTheDocument();
  });

  it('TC-PROJ5: Search operates on actual project data and calls API with query', async () => {
    getProjects.mockResolvedValue({ data: mockMultipleProjects });

    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('5 projects')).toBeInTheDocument();
    });

    // Perform search
    const searchInput = screen.getByPlaceholderText(/search projects/i);
    fireEvent.change(searchInput, { target: { value: 'Autonomous Rover' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(getProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Autonomous Rover',
        })
      );
    });
  });

  it('TC-PROJ6: API error renders error state with Retry and does NOT show "0 projects"', async () => {
    getProjects.mockRejectedValue(new Error('Connection lost to database'));

    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load your projects.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    // Critical: Do NOT make an API error look like "0 projects" or empty state!
    expect(screen.queryByText('0 projects')).not.toBeInTheDocument();
    expect(screen.queryByText(/your portfolio is empty/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/create your first project/i)).not.toBeInTheDocument();

    // Retry functionality
    getProjects.mockResolvedValueOnce({ data: [mockProjectSingle] });
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('1 project')).toBeInTheDocument();
      expect(screen.getByText('Smart Campus IoT Hub')).toBeInTheDocument();
    });
  });

  it('TC-PROJ7: Missing optional fields render blank without fake fallback strings', async () => {
    const sparseProject = {
      _id: 'proj-sparse',
      title: 'Minimal Project',
      // No shortDescription, no technologies, no github, no liveDeployment
      verificationStatus: 'Pending',
      projectStatus: 'In Progress',
      createdAt: '2026-03-01T10:00:00.000Z',
    };

    getProjects.mockResolvedValue({ data: [sparseProject] });

    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Minimal Project')).toBeInTheDocument();
      expect(screen.getByText('1 project')).toBeInTheDocument();
    });

    // Assert absence of synthetic strings or placeholders in the project card
    expect(screen.queryByText(/lorem ipsum/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/open github repository/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/open live deployment/i)).not.toBeInTheDocument();
  });

  it('TC-PROJ8: ProjectsList component behaves identically and data-driven', async () => {
    getProjects.mockResolvedValue({ data: [] });

    // Render using ProjectsList import
    const { default: ProjectsList } = await import('../projects/ProjectsList');

    render(
      <MemoryRouter>
        <ProjectsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('0 projects')).toBeInTheDocument();
      expect(screen.getByText('Your portfolio is empty')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create your first project/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add project/i })).toBeInTheDocument();
    });
  });

  it('TC-PROJ9: Filter and sort buttons pass correct parameters to getProjects', async () => {
    getProjects.mockResolvedValue({ data: mockMultipleProjects });

    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('5 projects')).toBeInTheDocument();
    });

    // Click 'Verified' filter
    fireEvent.click(screen.getByRole('button', { name: 'Verified' }));

    await waitFor(() => {
      expect(getProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'Verified',
        })
      );
    });

    // Change sort dropdown to 'Oldest'
    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'Oldest' } });

    await waitFor(() => {
      expect(getProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'Oldest',
        })
      );
    });
  });
});

