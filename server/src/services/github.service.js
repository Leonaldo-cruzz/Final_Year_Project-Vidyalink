/* global AbortController, clearTimeout, fetch, setTimeout */

import GitHubAccount from '../models/githubAccount.model.js';
import GitHubRepository from '../models/githubRepository.model.js';
import GitHubAnalytics from '../models/githubAnalytics.model.js';
import Project from '../models/project.model.js';
import ApiError from '../utils/ApiError.js';
import { githubUsernamePattern } from '../validators/github.validator.js';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const GITHUB_REQUEST_TIMEOUT_MS = 8_000;

const normalizeUsername = (username) => {
  const normalizedUsername = String(username || '').trim().replace(/^@/, '');
  if (!githubUsernamePattern.test(normalizedUsername)) {
    throw ApiError.badRequest('Enter a valid GitHub username');
  }
  return normalizedUsername;
};

const makeGithubRequest = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);
  const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'VidyaLink-GitHub-Integration',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw ApiError.notFound('GitHub resource was not found');
    }

    if (response.status === 403 || response.status === 429) {
      throw ApiError.tooManyRequests('GitHub rate limit reached. Please try again later.');
    }

    if (!response.ok) {
      throw ApiError.badGateway('GitHub service returned an unexpected status code');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw ApiError.gatewayTimeout('GitHub request timed out');
    }
    throw ApiError.serviceUnavailable('Unable to connect to GitHub right now');
  } finally {
    clearTimeout(timeout);
  }
};

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

class GithubService {
  /**
   * Fetch a user's GitHub public profile.
   */
  async fetchUserProfile(username) {
    const normalizedUsername = normalizeUsername(username);
    const profile = await makeGithubRequest(`/users/${encodeURIComponent(normalizedUsername)}`);
    if (!profile.login || !profile.html_url) {
      throw ApiError.badGateway('GitHub returned an incomplete profile');
    }
    return mapGithubProfile(profile);
  }

  /**
   * Fetch public repositories for a given GitHub username.
   */
  async fetchRepositories(username) {
    const normalizedUsername = normalizeUsername(username);
    const repos = await makeGithubRequest(
      `/users/${encodeURIComponent(normalizedUsername)}/repos?sort=pushed&direction=desc&per_page=100&type=public`
    );
    if (!Array.isArray(repos)) {
      return [];
    }
    return repos;
  }

  /**
   * Fetch single repository details by owner and repo name.
   */
  async fetchRepository(owner, repo) {
    const cleanOwner = String(owner || '').trim();
    const cleanRepo = String(repo || '').trim();
    if (!cleanOwner || !cleanRepo) {
      throw ApiError.badRequest('Repository owner and name are required');
    }
    return makeGithubRequest(`/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}`);
  }

  /**
   * Fetch languages breakdown for a repository.
   */
  async fetchLanguages(owner, repo) {
    try {
      const languages = await makeGithubRequest(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`
      );
      return typeof languages === 'object' && languages !== null ? Object.keys(languages) : [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch recent commits for a repository (optionally filtered by author).
   */
  async fetchCommits(owner, repo, author = null) {
    try {
      let endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=30`;
      if (author) {
        endpoint += `&author=${encodeURIComponent(author)}`;
      }
      const commits = await makeGithubRequest(endpoint);
      return Array.isArray(commits) ? commits : [];
    } catch {
      return [];
    }
  }

  /**
   * Check if a repository has a README.
   */
  async fetchReadme(owner, repo) {
    try {
      const readme = await makeGithubRequest(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`
      );
      return Boolean(readme && (readme.name || readme.path));
    } catch {
      return false;
    }
  }

  /**
   * Connect a GitHub account to the student profile.
   */
  async connect(userId, githubUsername) {
    const profileSnapshot = await this.fetchUserProfile(githubUsername);
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

    // Initial sync of repositories & analytics in background or inline
    try {
      await this.syncRepositories(userId);
      await this.calculateAnalytics(userId);
    } catch {
      // Continue even if repo sync has partial issues on connect
    }

    return account;
  }

  /**
   * Get connected GitHub account for a user.
   */
  async getProfile(userId) {
    const account = await GitHubAccount.findOne({ userId });
    if (!account) throw ApiError.notFound('No GitHub account is connected');
    return account;
  }

  /**
   * Synchronize repositories for the user's connected GitHub account.
   */
  async syncRepositories(userId) {
    const account = await GitHubAccount.findOne({ userId });
    if (!account) throw ApiError.notFound('No GitHub account is connected');
    if (account.connectionStatus === 'Disconnected') {
      throw ApiError.badRequest('Connect a GitHub account before syncing repositories');
    }

    const rawRepos = await this.fetchRepositories(account.githubUsername);
    const syncedRepos = [];
    const now = new Date();

    for (const repo of rawRepos) {
      if (!repo.id || !repo.name) continue;

      let languagesList = [];
      if (repo.language) languagesList.push(repo.language);

      // Check README existence for public repos
      const hasReadme = await this.fetchReadme(account.githubUsername, repo.name);

      const repoDoc = await GitHubRepository.findOneAndUpdate(
        { userId, repositoryId: repo.id },
        {
          $set: {
            githubAccountId: account._id,
            repositoryName: repo.name,
            fullName: repo.full_name || `${account.githubUsername}/${repo.name}`,
            description: repo.description || null,
            htmlUrl: repo.html_url,
            isPrivate: Boolean(repo.private),
            isFork: Boolean(repo.fork),
            isArchived: Boolean(repo.archived),
            defaultBranch: repo.default_branch || 'main',
            language: repo.language || null,
            languages: languagesList,
            stars: Number(repo.stargazers_count) || 0,
            forks: Number(repo.forks_count) || 0,
            watchers: Number(repo.watchers_count) || 0,
            openIssues: Number(repo.open_issues_count) || 0,
            createdAtGithub: repo.created_at ? new Date(repo.created_at) : null,
            updatedAtGithub: repo.updated_at ? new Date(repo.updated_at) : null,
            pushedAtGithub: repo.pushed_at ? new Date(repo.pushed_at) : null,
            sizeKb: Number(repo.size) || 0,
            readmePresent: hasReadme,
            lastAnalyzedAt: now,
            syncVersion: '1.0',
          },
          $setOnInsert: {
            userId,
            repositoryId: repo.id,
          },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );

      syncedRepos.push(repoDoc);
    }

    return syncedRepos;
  }

  /**
   * Calculate aggregated GitHub analytics from synced repositories.
   */
  async calculateAnalytics(userId) {
    const account = await GitHubAccount.findOne({ userId });
    if (!account) throw ApiError.notFound('No GitHub account is connected');

    const repos = await GitHubRepository.find({ userId }).lean();
    const totalRepos = repos.length;

    let totalStars = 0;
    let totalForks = 0;
    let readmeCount = 0;
    const languagesSet = new Set();
    let latestActivity = null;
    let activeReposCount = 0;

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    for (const r of repos) {
      totalStars += r.stars || 0;
      totalForks += r.forks || 0;

      if (r.readmePresent) {
        readmeCount += 1;
      }

      if (r.language && typeof r.language === 'string') {
        languagesSet.add(r.language.trim());
      }
      for (const lang of (r.languages || [])) {
        if (lang && typeof lang === 'string') {
          languagesSet.add(lang.trim());
        }
      }

      const pushed = r.pushedAtGithub ? new Date(r.pushedAtGithub) : null;
      if (pushed) {
        if (!latestActivity || pushed > latestActivity) {
          latestActivity = pushed;
        }
        if (pushed >= ninetyDaysAgo && !r.isArchived) {
          activeReposCount += 1;
        }
      }
    }

    const readmeCoverage = totalRepos > 0 ? Math.round((readmeCount / totalRepos) * 100) : 0;
    const documentationCoverage = readmeCoverage;

    const analyticsDoc = await GitHubAnalytics.create({
      userId,
      githubAccountId: account._id,
      repositoryCount: totalRepos,
      activeRepositoryCount: activeReposCount,
      totalStars,
      totalForks,
      languages: Array.from(languagesSet),
      commitCount: 0, // Recorded when fine-grained commit data is available
      recentCommitCount: 0,
      contributionActivity: {
        publicRepos: account.publicRepos || totalRepos,
        followers: account.followers || 0,
        following: account.following || 0,
      },
      recentActivityDate: latestActivity,
      averageCommitFrequency: 0,
      readmeCoverage,
      documentationCoverage,
      analyticsVersion: '1.0',
      calculatedAt: new Date(),
    });

    return analyticsDoc;
  }

  /**
   * Synchronize profile, repositories, and calculate analytics for a user.
   */
  async sync(userId) {
    const account = await GitHubAccount.findOne({ userId });
    if (!account) throw ApiError.notFound('No GitHub account is connected');
    if (account.connectionStatus === 'Disconnected') {
      throw ApiError.badRequest('Connect a GitHub account before syncing');
    }

    const profileSnapshot = await this.fetchUserProfile(account.githubUsername);
    Object.assign(account, profileSnapshot, {
      lastSyncedAt: new Date(),
      connectionStatus: 'Connected',
    });
    await account.save();

    await this.syncRepositories(userId);
    const analytics = await this.calculateAnalytics(userId);

    return {
      account,
      analytics,
    };
  }

  /**
   * Disconnect a GitHub account.
   */
  async disconnect(userId) {
    const account = await GitHubAccount.findOne({ userId });
    if (!account) throw ApiError.notFound('No GitHub account is connected');

    account.connectionStatus = 'Disconnected';
    await account.save();
    return account;
  }

  /**
   * Parse GitHub URL safely and extract owner and repository name.
   */
  parseGitHubUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/.*)?$/i);
    if (!match) {
      return null;
    }
    const owner = match[1];
    const repo = match[2].replace(/\.git$/i, '');
    return { owner, repo, fullName: `${owner}/${repo}` };
  }

  /**
   * Verify repository existence and identity for a student's project.
   */
  async verifyProjectRepository(userId, projectId) {
    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) {
      throw ApiError.notFound('Project not found or unauthorized');
    }

    const githubUrl = project.githubRepository;
    if (!githubUrl) {
      throw ApiError.badRequest('Project does not have a linked GitHub repository URL');
    }

    const parsed = this.parseGitHubUrl(githubUrl);
    if (!parsed) {
      return {
        verified: false,
        repositoryExists: false,
        accountMatch: false,
        activityDetected: false,
        message: 'Invalid GitHub repository URL format',
      };
    }

    const account = await GitHubAccount.findOne({ userId });
    const connectedUsername = account?.githubUsername?.toLowerCase() || null;
    const isAccountMatch = Boolean(connectedUsername && parsed.owner.toLowerCase() === connectedUsername);

    try {
      const repoDetails = await this.fetchRepository(parsed.owner, parsed.repo);
      const languages = await this.fetchLanguages(parsed.owner, parsed.repo);
      const hasReadme = await this.fetchReadme(parsed.owner, parsed.repo);

      const hasRecentActivity = Boolean(
        repoDetails.pushed_at &&
        (new Date() - new Date(repoDetails.pushed_at)) < 180 * 24 * 60 * 60 * 1000
      );

      return {
        verified: true,
        repositoryExists: true,
        accountMatch: isAccountMatch,
        activityDetected: hasRecentActivity || Boolean(repoDetails.stargazers_count > 0 || repoDetails.size > 0),
        repository: {
          fullName: repoDetails.full_name,
          owner: parsed.owner,
          name: parsed.repo,
          isFork: Boolean(repoDetails.fork),
          isPrivate: Boolean(repoDetails.private),
          defaultBranch: repoDetails.default_branch || 'main',
          language: repoDetails.language || null,
          languages,
          stars: repoDetails.stargazers_count || 0,
          forks: repoDetails.forks_count || 0,
          hasReadme,
          pushedAt: repoDetails.pushed_at,
        },
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return {
          verified: false,
          repositoryExists: false,
          accountMatch: isAccountMatch,
          activityDetected: false,
          message: 'GitHub repository does not exist or is private',
        };
      }
      throw error;
    }
  }

  /**
   * Get all synced repositories for a user.
   */
  async getRepositories(userId) {
    return GitHubRepository.find({ userId }).sort({ pushedAtGithub: -1, stars: -1 });
  }

  /**
   * Get single repository for a user by owner/repo.
   */
  async getRepository(userId, owner, repo) {
    let repository = await GitHubRepository.findOne({
      userId,
      fullName: new RegExp(`^${owner}/${repo}$`, 'i'),
    });

    if (!repository) {
      // Try to fetch live from GitHub
      const repoDetails = await this.fetchRepository(owner, repo);
      return repoDetails;
    }

    return repository;
  }

  /**
   * Get latest analytics snapshot for a user.
   */
  async getAnalytics(userId) {
    let analytics = await GitHubAnalytics.findOne({ userId }).sort({ calculatedAt: -1 });
    if (!analytics) {
      // Calculate on demand if not present
      const account = await GitHubAccount.findOne({ userId });
      if (account) {
        analytics = await this.calculateAnalytics(userId);
      } else {
        throw ApiError.notFound('No connected GitHub account found for analytics');
      }
    }
    return analytics;
  }
}

export { normalizeUsername, mapGithubProfile, makeGithubRequest };
export default new GithubService();
