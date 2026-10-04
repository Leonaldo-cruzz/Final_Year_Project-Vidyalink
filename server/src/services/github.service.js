/* global AbortController, clearTimeout, fetch, setTimeout, URL */

import GitHubAccount from '../models/githubAccount.model.js';
import Project from '../models/project.model.js';
import ApiError from '../utils/ApiError.js';
import { githubUsernamePattern } from '../validators/github.validator.js';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const GITHUB_REQUEST_TIMEOUT_MS = 10_000;
const GITHUB_REPOS_PER_PAGE = 100; // max allowed by GitHub API
const GITHUB_MAX_PAGES = 10;       // safety ceiling: up to 1000 repositories

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalizeUsername = (username) => {
  const normalized = String(username || '').trim().replace(/^@/, '');
  if (!githubUsernamePattern.test(normalized)) {
    throw ApiError.badRequest('Enter a valid GitHub username');
  }
  return normalized;
};

/**
 * Canonical GitHub repository URL normalization.
 * Treats these as identical:
 *   https://github.com/user/repo
 *   https://github.com/user/repo/
 *   https://github.com/user/repo.git
 *   HTTP://GITHUB.COM/User/Repo
 */
const normalizeGithubUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const url = new URL(rawUrl.trim());
    // Must be github.com
    if (!url.hostname.toLowerCase().endsWith('github.com')) return null;
    // Normalize path: lowercase, strip trailing slash, strip .git
    const normalized = url.pathname
      .toLowerCase()
      .replace(/\.git$/, '')
      .replace(/\/+$/, '');
    return `https://github.com${normalized}`;
  } catch {
    return null;
  }
};

/** Extract clean repository name for use as a project title. */
const repoNameToTitle = (name) => {
  if (!name) return 'Untitled Repository';
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

/**
 * Derive a human-readable category from GitHub topics or primary language.
 * Returns one of the PROJECT_CATEGORIES values.
 */
const inferCategory = (language, topics = []) => {
  const topicSet = new Set((topics || []).map((t) => t.toLowerCase()));
  const lang = (language || '').toLowerCase();

  if (topicSet.has('machine-learning') || topicSet.has('deep-learning') || topicSet.has('ai')) return 'AI / ML';
  if (topicSet.has('mobile') || topicSet.has('android') || topicSet.has('ios') || topicSet.has('react-native')) return 'Mobile App';
  if (topicSet.has('cloud') || topicSet.has('aws') || topicSet.has('gcp') || topicSet.has('azure')) return 'Cloud';
  if (topicSet.has('security') || topicSet.has('cybersecurity') || topicSet.has('ctf')) return 'Cyber Security';
  if (topicSet.has('iot') || topicSet.has('embedded') || topicSet.has('arduino') || topicSet.has('raspberry-pi')) return 'IoT';
  if (topicSet.has('blockchain') || topicSet.has('web3') || topicSet.has('solidity')) return 'Blockchain';
  if (lang === 'python' && (topicSet.has('ml') || topicSet.has('data-science') || topicSet.has('pandas'))) return 'AI / ML';
  if (['javascript', 'typescript', 'html', 'css', 'vue', 'svelte'].includes(lang)) return 'Web Development';
  if (lang === 'dart' || lang === 'kotlin' || lang === 'swift') return 'Mobile App';
  if (lang === 'solidity') return 'Blockchain';
  return 'Other';
};

/**
 * Derive technology tags from the repository's primary language and topics.
 * Only uses actual evidence — no fabrication.
 * Returns at least one entry so the Project validator (technologies.length > 0) is satisfied.
 */
const inferTechnologies = (language, topics = []) => {
  const techs = new Set();
  if (language) techs.add(language);
  const knownTechs = [
    'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt',
    'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Prisma', 'Mongoose',
    'Docker', 'Kubernetes', 'Terraform', 'GitHub Actions',
    'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy',
    'GraphQL', 'REST', 'gRPC', 'WebSockets',
    'Tailwind CSS', 'Bootstrap', 'Sass', 'Vite', 'Webpack',
    'React Native', 'Flutter', 'Electron',
    'Solidity', 'Web3.js', 'Hardhat',
    'AWS', 'GCP', 'Azure', 'Firebase',
  ];
  const topicLower = (topics || []).map((t) => t.toLowerCase());
  for (const tech of knownTechs) {
    if (topicLower.some((t) => t.includes(tech.toLowerCase().replace(/\s+/g, '-')) || t.includes(tech.toLowerCase()))) {
      techs.add(tech);
    }
  }
  const result = [...techs].slice(0, 10);
  return result.length > 0 ? result : ['GitHub'];
};

// ── GitHub API fetch helpers ─────────────────────────────────────────────────

const mapGithubProfile = (profile) => ({
  githubUsername: profile.login,
  githubProfileUrl: profile.html_url,
  avatarUrl: profile.avatar_url || null,
  name: profile.name || null,
  bio: profile.bio || null,
  followers: Number(profile.followers) || 0,
  following: Number(profile.following) || 0,
  publicRepos: Number(profile.public_repos) || 0,
  publicGists: Number(profile.public_gists) || 0,
  joinedAt: profile.created_at ? new Date(profile.created_at) : null,
});

const fetchGithubProfile = async (username) => {
  const normalizedUsername = normalizeUsername(username);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${GITHUB_API_BASE_URL}/users/${encodeURIComponent(normalizedUsername)}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'VidyaLink-GitHub-Integration',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: controller.signal,
      }
    );

    if (response.status === 404) throw ApiError.notFound('GitHub username was not found');
    if (response.status === 403 || response.status === 429) {
      throw ApiError.tooManyRequests('GitHub rate limit reached. Please try again later.');
    }
    if (!response.ok) throw ApiError.internal('GitHub could not return this profile right now');

    const profile = await response.json();
    if (!profile.login || !profile.html_url) {
      throw ApiError.internal('GitHub returned an incomplete profile');
    }
    return mapGithubProfile(profile);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') throw ApiError.internal('GitHub profile request timed out');
    throw ApiError.internal('Unable to connect to GitHub right now');
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Full repository metadata mapper.
 * Only maps fields that are actually present in the GitHub API response.
 * Never fabricates missing values — all optional fields default to null/false/0.
 */
const mapGithubRepository = (repo) => ({
  // Stable identity
  id: repo.id,                                // GitHub's immutable numeric repo ID
  fullName: repo.full_name,                   // "owner/repo"
  name: repo.name,
  // URLs
  htmlUrl: repo.html_url,
  cloneUrl: repo.clone_url || null,
  // Metadata
  description: repo.description || null,
  language: repo.language || null,
  topics: Array.isArray(repo.topics) ? repo.topics : [],
  defaultBranch: repo.default_branch || 'main',
  // Stats
  stars: Number(repo.stargazers_count) || 0,
  forks: Number(repo.forks_count) || 0,
  openIssues: Number(repo.open_issues_count) || 0,
  // State flags — do NOT hide these
  isPrivate: Boolean(repo.private),
  isFork: Boolean(repo.fork),
  isArchived: Boolean(repo.archived),
  isEmpty: repo.size === 0,
  // Timestamps
  pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
  updatedAt: repo.updated_at ? new Date(repo.updated_at) : null,
  createdAt: repo.created_at ? new Date(repo.created_at) : null,
});

/**
 * Fetches ALL accessible repositories for a GitHub user using pagination.
 * Stops when a page returns fewer results than per_page (last page reached)
 * or when GITHUB_MAX_PAGES is hit (safety ceiling).
 *
 * Handles: 401, 403, 404, 429, 500, timeout, network failure.
 * Throws ApiError — never returns partial fake data.
 */
const fetchAllGithubRepositories = async (username) => {
  const normalizedUsername = normalizeUsername(username);
  const allRepos = [];

  for (let page = 1; page <= GITHUB_MAX_PAGES; page++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);

    let pageRepos;
    try {
      const url = `${GITHUB_API_BASE_URL}/users/${encodeURIComponent(normalizedUsername)}/repos`
        + `?sort=updated&per_page=${GITHUB_REPOS_PER_PAGE}&page=${page}`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'VidyaLink-GitHub-Integration',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: controller.signal,
      });

      if (response.status === 401) throw ApiError.unauthorized('GitHub authentication failed');
      if (response.status === 404) throw ApiError.notFound('GitHub username was not found');
      if (response.status === 403 || response.status === 429) {
        throw ApiError.tooManyRequests('GitHub rate limit reached. Please try again later.');
      }
      if (!response.ok) {
        throw ApiError.internal(`GitHub returned status ${response.status} while fetching repositories`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw ApiError.internal('GitHub returned invalid repository data');
      }

      pageRepos = data.map(mapGithubRepository);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error.name === 'AbortError') throw ApiError.internal('GitHub repository request timed out');
      throw ApiError.internal('Unable to connect to GitHub right now');
    } finally {
      clearTimeout(timeout);
    }

    allRepos.push(...pageRepos);

    // Last page: fewer results than per_page means no more pages
    if (pageRepos.length < GITHUB_REPOS_PER_PAGE) break;
  }

  return allRepos;
};

// ── Core sync-to-projects logic ──────────────────────────────────────────────

/**
 * Compares a list of GitHub repositories against the student's existing
 * VidyaLink projects and either:
 *   - UPDATES  an existing project that matches by githubRepositoryId (primary)
 *              or normalized GitHub URL (secondary)
 *   - CREATES  a new project for unmatched repositories
 *
 * Rules enforced:
 *  - Only touches projects owned by `userId` (ownership enforced from token)
 *  - Never changes verificationStatus to 'Verified'
 *  - Never overwrites student-entered descriptions, documentation, or verification history
 *  - Idempotent: safe to run repeatedly
 *  - Repos absent from current sync that have existing projects → marked 'deleted' (not removed)
 *
 * @param {string} userId     Authenticated student's ObjectId (from JWT — never trusted from client)
 * @param {Array}  repos      Mapped repository objects from fetchAllGithubRepositories
 * @returns {{ imported: number, updated: number, markedDeleted: number }}
 */
const syncProjectsFromRepositories = async (userId, repos) => {
  if (!repos || repos.length === 0) {
    return { imported: 0, updated: 0, markedDeleted: 0 };
  }

  // Load all of this student's existing projects in one query
  const query = Project.find({ userId });
  const existingProjects = (query && typeof query.lean === 'function')
    ? await query.lean()
    : await query;

  // Build fast-lookup maps
  const byGithubId = new Map();    // githubRepositoryId → project
  const byNormalizedUrl = new Map(); // normalizedGithubUrl → project

  for (const proj of existingProjects) {
    if (proj.githubRepositoryId) {
      byGithubId.set(proj.githubRepositoryId, proj);
    }
    const normUrl = normalizeGithubUrl(proj.githubRepository);
    if (normUrl) {
      byNormalizedUrl.set(normUrl, proj);
    }
  }

  // Track which GitHub repo IDs were seen in this sync
  const seenRepoIds = new Set(repos.map((r) => r.id));

  let imported = 0;
  let updated = 0;

  for (const repo of repos) {
    // ── Attempt primary match: githubRepositoryId ─────────────────────────
    let existingProject = byGithubId.get(repo.id) ?? null;

    // ── Attempt secondary match: normalized URL ───────────────────────────
    if (!existingProject) {
      const normUrl = normalizeGithubUrl(repo.htmlUrl);
      if (normUrl) existingProject = byNormalizedUrl.get(normUrl) ?? null;
    }

    if (existingProject) {
      // ── UPDATE path ───────────────────────────────────────────────────────
      // Only sync GitHub-derived fields. Never overwrite student-entered content.
      const updateFields = {
        githubRepository: repo.htmlUrl,
        githubRepositoryId: repo.id,
        githubSyncStatus: 'synced',
        // Update language/tech only if the project has no student-customized technologies
        // (i.e., technologies still equals the GitHub-inferred value or is the default 'GitHub' tag)
      };

      // Always update the GitHub URL and ID for better future matching
      await Project.updateOne(
        { _id: existingProject._id, userId },
        { $set: updateFields }
      );
      updated++;
    } else {
      // ── IMPORT path ───────────────────────────────────────────────────────
      // Build a minimal safe description. Use actual repo description or leave honest empty.
      const shortDesc = repo.description
        ? repo.description.slice(0, 500)
        : `GitHub repository: ${repo.fullName}`;

      const detailedDesc = repo.description
        ? repo.description.slice(0, 2000)
        : `This project was imported from GitHub repository ${repo.fullName}. `
          + `Review and update the description to reflect your actual work.`;

      const technologies = inferTechnologies(repo.language, repo.topics);
      const category = inferCategory(repo.language, repo.topics);

      await Project.create({
        userId,
        title: repoNameToTitle(repo.name),
        shortDescription: shortDesc,
        detailedDescription: detailedDesc,
        category,
        technologies,
        githubRepository: repo.htmlUrl,
        githubRepositoryId: repo.id,
        githubSyncStatus: 'synced',
        githubSource: 'github_sync',
        // CRITICAL: imported projects are NOT verified.
        // They remain 'Pending' until faculty review.
        verificationStatus: 'Pending',
        projectStatus: repo.isArchived ? 'Archived' : 'In Progress',
        deploymentStatus: 'not_provided',
      });
      imported++;
    }
  }

  // ── Mark previously-synced projects whose repos are now absent ────────────
  // Do NOT delete them — preserve the student's portfolio and verification history.
  let markedDeleted = 0;
  const syncedProjectsNoLongerPresent = existingProjects.filter(
    (proj) =>
      proj.githubSource === 'github_sync' &&
      proj.githubSyncStatus === 'synced' &&
      proj.githubRepositoryId &&
      !seenRepoIds.has(proj.githubRepositoryId)
  );

  if (syncedProjectsNoLongerPresent.length > 0) {
    const ids = syncedProjectsNoLongerPresent.map((p) => p._id);
    await Project.updateMany(
      { _id: { $in: ids }, userId },
      { $set: { githubSyncStatus: 'deleted' } }
    );
    markedDeleted = syncedProjectsNoLongerPresent.length;
  }

  return { imported, updated, markedDeleted };
};

// ── GithubService class ──────────────────────────────────────────────────────

class GithubService {
  async connect(userId, githubUsername) {
    const profileSnapshot = await fetchGithubProfile(githubUsername);
    const account = await GitHubAccount.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...profileSnapshot,
          lastSyncedAt: new Date(),
          connectionStatus: 'Connected',
        },
        $setOnInsert: { userId },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return account;
  }

  async getProfile(userId) {
    const account = await GitHubAccount.findOne({ userId });
    if (!account) throw ApiError.notFound('No GitHub account is connected');
    return account;
  }

  async getRepositories(userId) {
    const account = await GitHubAccount.findOne({ userId });
    if (!account) throw ApiError.notFound('No GitHub account is connected');
    if (account.connectionStatus === 'Disconnected') {
      throw ApiError.badRequest('Connect your GitHub account to retrieve repositories');
    }
    return fetchAllGithubRepositories(account.githubUsername);
  }

  /**
   * Full sync:
   *  1. Refresh GitHub profile snapshot
   *  2. Fetch ALL repositories (paginated)
   *  3. Match against student's existing VidyaLink projects → update or import
   *  4. Mark deleted repos
   *  5. Return structured sync result
   */
  async sync(userId) {
    const account = await GitHubAccount.findOne({ userId });
    if (!account) throw ApiError.notFound('No GitHub account is connected');
    if (account.connectionStatus === 'Disconnected') {
      throw ApiError.badRequest('Connect a GitHub account before syncing');
    }

    // 1. Refresh profile
    const profileSnapshot = await fetchGithubProfile(account.githubUsername);
    Object.assign(account, profileSnapshot, {
      lastSyncedAt: new Date(),
      connectionStatus: 'Connected',
    });
    await account.save();

    // 2. Fetch ALL repositories with pagination
    const repos = await fetchAllGithubRepositories(account.githubUsername);

    // 3+4. Match existing, import new, mark deleted
    const { imported, updated, markedDeleted } = await syncProjectsFromRepositories(userId, repos);

    return {
      account,
      syncResult: {
        repositoriesFound: repos.length,
        projectsImported: imported,
        projectsUpdated: updated,
        repositoriesMarkedDeleted: markedDeleted,
        failed: 0,
      },
    };
  }

  async disconnect(userId) {
    const account = await GitHubAccount.findOne({ userId });
    if (!account) throw ApiError.notFound('No GitHub account is connected');
    // IMPORTANT: disconnecting GitHub does NOT delete projects.
    // Portfolio records belong to the student independently of GitHub connection.
    account.connectionStatus = 'Disconnected';
    await account.save();
    return account;
  }
}

export {
  fetchGithubProfile,
  fetchAllGithubRepositories as fetchGithubRepositories,
  normalizeGithubUrl,
  syncProjectsFromRepositories,
};
export default new GithubService();
