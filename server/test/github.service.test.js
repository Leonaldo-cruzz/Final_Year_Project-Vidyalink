/**
 * Unit tests for GithubService - Repository Synchronization, Analytics, and Verification.
 */

/* global global, process */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Environment setup ─────────────────────────────────────────────────────────
process.env.JWT_SECRET = 'test-jwt-secret-for-vitest-32chars';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-vitest-32chars';
process.env.MONGODB_URI = 'mongodb://localhost:27017/vidyalink-test';

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('../src/models/githubAccount.model.js', () => ({
  default: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../src/models/githubRepository.model.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../src/models/githubAnalytics.model.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../src/models/project.model.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

// ── Test Subjects ──────────────────────────────────────────────────────────────
const githubService = (await import('../src/services/github.service.js')).default;
const GitHubAccount = (await import('../src/models/githubAccount.model.js')).default;
const GitHubRepository = (await import('../src/models/githubRepository.model.js')).default;
const GitHubAnalytics = (await import('../src/models/githubAnalytics.model.js')).default;
const Project = (await import('../src/models/project.model.js')).default;

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('GithubService - parseGitHubUrl()', () => {
  it('parses standard https GitHub URLs', () => {
    const result = githubService.parseGitHubUrl('https://github.com/octocat/Hello-World');
    expect(result).toEqual({
      owner: 'octocat',
      repo: 'Hello-World',
      fullName: 'octocat/Hello-World',
    });
  });

  it('parses URLs with .git suffix', () => {
    const result = githubService.parseGitHubUrl('https://github.com/octocat/Spoon-Knife.git');
    expect(result).toEqual({
      owner: 'octocat',
      repo: 'Spoon-Knife',
      fullName: 'octocat/Spoon-Knife',
    });
  });

  it('parses URLs with trailing slashes or subpaths', () => {
    const result = githubService.parseGitHubUrl('github.com/octocat/Hello-World/tree/main');
    expect(result?.owner).toBe('octocat');
    expect(result?.repo).toBe('Hello-World');
  });

  it('returns null for non-GitHub URLs or invalid strings', () => {
    expect(githubService.parseGitHubUrl('https://gitlab.com/user/repo')).toBeNull();
    expect(githubService.parseGitHubUrl('not-a-url')).toBeNull();
    expect(githubService.parseGitHubUrl(null)).toBeNull();
  });
});

describe('GithubService - fetchUserProfile()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and maps public user profile successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        login: 'octocat',
        html_url: 'https://github.com/octocat',
        avatar_url: 'https://avatars.githubusercontent.com/u/583231',
        name: 'The Octocat',
        bio: 'GitHub mascot',
        followers: 100,
        following: 5,
        public_repos: 8,
        public_gists: 2,
        created_at: '2011-01-25T18:44:36Z',
      }),
    });

    const profile = await githubService.fetchUserProfile('octocat');
    expect(profile.githubUsername).toBe('octocat');
    expect(profile.publicRepos).toBe(8);
    expect(profile.followers).toBe(100);
  });

  it('throws ApiError 404 when username does not exist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not Found' }),
    });

    await expect(githubService.fetchUserProfile('nonexistent-user-12345')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws ApiError 429 when rate limit is exceeded', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'API rate limit exceeded' }),
    });

    await expect(githubService.fetchUserProfile('octocat')).rejects.toMatchObject({
      statusCode: 429,
    });
  });
});

describe('GithubService - verifyProjectRepository()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies repository existence and detects matching account', async () => {
    Project.findOne.mockResolvedValue({
      _id: 'proj-123',
      userId: 'user-123',
      githubRepository: 'https://github.com/student-dev/awesome-app',
    });

    GitHubAccount.findOne.mockResolvedValue({
      userId: 'user-123',
      githubUsername: 'student-dev',
    });

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/languages')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ JavaScript: 10000, Python: 5000 }),
        });
      }
      if (url.includes('/readme')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ name: 'README.md' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          id: 123456,
          name: 'awesome-app',
          full_name: 'student-dev/awesome-app',
          fork: false,
          private: false,
          default_branch: 'main',
          language: 'JavaScript',
          stargazers_count: 5,
          forks_count: 1,
          pushed_at: new Date().toISOString(),
          size: 1024,
        }),
      });
    });

    const result = await githubService.verifyProjectRepository('user-123', 'proj-123');
    expect(result.verified).toBe(true);
    expect(result.repositoryExists).toBe(true);
    expect(result.accountMatch).toBe(true);
    expect(result.activityDetected).toBe(true);
    expect(result.repository?.hasReadme).toBe(true);
  });

  it('verifies repository existence with account mismatch (different owner)', async () => {
    Project.findOne.mockResolvedValue({
      _id: 'proj-456',
      userId: 'user-123',
      githubRepository: 'https://github.com/other-org/some-library',
    });

    GitHubAccount.findOne.mockResolvedValue({
      userId: 'user-123',
      githubUsername: 'student-dev',
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 789,
        name: 'some-library',
        full_name: 'other-org/some-library',
        stargazers_count: 20,
      }),
    });

    const result = await githubService.verifyProjectRepository('user-123', 'proj-456');
    expect(result.verified).toBe(true);
    expect(result.repositoryExists).toBe(true);
    expect(result.accountMatch).toBe(false);
  });

  it('returns verified: false when repository is not found (404)', async () => {
    Project.findOne.mockResolvedValue({
      _id: 'proj-789',
      userId: 'user-123',
      githubRepository: 'https://github.com/student-dev/deleted-repo',
    });

    GitHubAccount.findOne.mockResolvedValue({
      userId: 'user-123',
      githubUsername: 'student-dev',
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not Found' }),
    });

    const result = await githubService.verifyProjectRepository('user-123', 'proj-789');
    expect(result.verified).toBe(false);
    expect(result.repositoryExists).toBe(false);
  });

  it('returns format error for invalid GitHub URL', async () => {
    Project.findOne.mockResolvedValue({
      _id: 'proj-bad',
      userId: 'user-123',
      githubRepository: 'invalid-url-here',
    });

    const result = await githubService.verifyProjectRepository('user-123', 'proj-bad');
    expect(result.verified).toBe(false);
    expect(result.message).toContain('Invalid GitHub');
  });
});

describe('GithubService - calculateAnalytics()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calculates aggregate metrics across repositories accurately', async () => {
    GitHubAccount.findOne.mockResolvedValue({
      _id: 'acc-1',
      userId: 'user-1',
      publicRepos: 3,
      followers: 12,
      following: 4,
    });

    GitHubRepository.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          repositoryId: 1,
          stars: 10,
          forks: 2,
          language: 'TypeScript',
          languages: ['TypeScript', 'JavaScript'],
          readmePresent: true,
          pushedAtGithub: new Date(),
          isArchived: false,
        },
        {
          repositoryId: 2,
          stars: 5,
          forks: 1,
          language: 'Python',
          languages: ['Python'],
          readmePresent: true,
          pushedAtGithub: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          isArchived: false,
        },
        {
          repositoryId: 3,
          stars: 0,
          forks: 0,
          language: 'HTML',
          languages: ['HTML'],
          readmePresent: false,
          pushedAtGithub: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
          isArchived: false,
        },
      ]),
    });

    GitHubAnalytics.create.mockImplementation(async (data) => ({
      _id: 'analytics-1',
      ...data,
    }));

    const analytics = await githubService.calculateAnalytics('user-1');
    expect(analytics.repositoryCount).toBe(3);
    expect(analytics.activeRepositoryCount).toBe(2);
    expect(analytics.totalStars).toBe(15);
    expect(analytics.totalForks).toBe(3);
    expect(analytics.languages).toContain('TypeScript');
    expect(analytics.languages).toContain('Python');
    expect(analytics.readmeCoverage).toBe(67); // 2 out of 3 = ~67%
  });

  it('handles zero repositories without errors', async () => {
    GitHubAccount.findOne.mockResolvedValue({
      _id: 'acc-empty',
      userId: 'user-empty',
      publicRepos: 0,
    });

    GitHubRepository.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    });

    GitHubAnalytics.create.mockImplementation(async (data) => ({
      _id: 'analytics-empty',
      ...data,
    }));

    const analytics = await githubService.calculateAnalytics('user-empty');
    expect(analytics.repositoryCount).toBe(0);
    expect(analytics.totalStars).toBe(0);
    expect(analytics.readmeCoverage).toBe(0);
  });
});
