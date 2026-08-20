/* global AbortController, clearTimeout, setTimeout */

import GitHubAccount from '../models/githubAccount.model.js';
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

    if (response.status === 404) {
      throw ApiError.notFound('GitHub username was not found');
    }

    if (response.status === 403 || response.status === 429) {
      throw ApiError.tooManyRequests('GitHub rate limit reached. Please try again later.');
    }

    if (!response.ok) {
      throw ApiError.internal('GitHub could not return this profile right now');
    }

    const profile = await response.json();
    if (!profile.login || !profile.html_url) {
      throw ApiError.internal('GitHub returned an incomplete profile');
    }

    return mapGithubProfile(profile);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw ApiError.internal('GitHub profile request timed out');
    }
    throw ApiError.internal('Unable to connect to GitHub right now');
  } finally {
    clearTimeout(timeout);
  }
};

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

  async sync(userId) {
    const account = await GitHubAccount.findOne({ userId });
    if (!account) throw ApiError.notFound('No GitHub account is connected');
    if (account.connectionStatus === 'Disconnected') {
      throw ApiError.badRequest('Connect a GitHub account before syncing');
    }

    const profileSnapshot = await fetchGithubProfile(account.githubUsername);
    Object.assign(account, profileSnapshot, {
      lastSyncedAt: new Date(),
      connectionStatus: 'Connected',
    });
    await account.save();
    return account;
  }

  async disconnect(userId) {
    const account = await GitHubAccount.findOne({ userId });
    if (!account) throw ApiError.notFound('No GitHub account is connected');

    account.connectionStatus = 'Disconnected';
    await account.save();
    return account;
  }
}

export { fetchGithubProfile };
export default new GithubService();
