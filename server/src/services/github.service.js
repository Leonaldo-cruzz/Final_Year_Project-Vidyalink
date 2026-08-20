/* global AbortController, clearTimeout, fetch, setTimeout */

import GitHubAccount from '../models/githubAccount.model.js';
import { externalServices } from '../config/externalServices.js';
import ApiError from '../utils/ApiError.js';
import { githubUsernamePattern } from '../validators/github.validator.js';

const githubConfiguration = externalServices.github;

export const createGithubHeaders = (token) => ({
  Accept: 'application/vnd.github+json',
  'User-Agent': 'VidyaLink-GitHub-Integration',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(token && { Authorization: `Bearer ${token}` }),
});

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
  const timeout = setTimeout(() => controller.abort(), githubConfiguration.requestTimeoutMs);

  try {
    const response = await fetch(
      `${githubConfiguration.apiBaseUrl.replace(/\/+$/, '')}/users/${encodeURIComponent(normalizedUsername)}`,
      {
        // This endpoint retrieves public profile data. Do not attach an optional
        // private token unless a future private GitHub endpoint requires it.
        headers: createGithubHeaders(),
        signal: controller.signal,
      }
    );

    if (response.status === 404) {
      throw ApiError.notFound('GitHub username was not found');
    }

    const rateLimitRemaining = response.headers?.get?.('x-ratelimit-remaining');
    if (response.status === 429 || (response.status === 403 && rateLimitRemaining === '0')) {
      throw ApiError.tooManyRequests('GitHub rate limit reached. Please try again later.');
    }

    if (!response.ok) {
      throw ApiError.internal('GitHub API request failed');
    }

    let profile;
    try {
      profile = await response.json();
    } catch {
      throw ApiError.internal('GitHub returned an invalid response');
    }
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
