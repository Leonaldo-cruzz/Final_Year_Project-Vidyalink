import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import env from '../config/env.js';
import User from '../models/user.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import githubService from '../services/github.service.js';

const mockGithubResponse = (overrides = {}) => ({
  login: 'vidyalink-test-user',
  html_url: 'https://github.com/vidyalink-test-user',
  avatar_url: 'https://avatars.githubusercontent.com/u/1',
  name: 'VidyaLink Test User',
  bio: 'A mocked public profile',
  followers: 42,
  following: 18,
  public_repos: 12,
  public_gists: 2,
  created_at: '2020-01-01T00:00:00Z',
  ...overrides,
});

const run = async () => {
  let testUser;
  const previousFetch = globalThis.fetch;

  try {
    await mongoose.connect(env.MONGODB_URI);
    testUser = await User.create({
      fullName: 'GitHub Integration Test Student',
      email: `github_integration_${Date.now()}@vidyalink.test`,
      password: 'Password123!',
      role: 'student',
      status: 'active',
    });

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => mockGithubResponse(),
    });

    const connected = await githubService.connect(testUser._id, 'vidyalink-test-user');
    assert.equal(connected.connectionStatus, 'Connected');
    assert.equal(connected.followers, 42);
    assert.equal(await GitHubAccount.countDocuments({ userId: testUser._id }), 1);

    const fetched = await githubService.getProfile(testUser._id);
    assert.equal(fetched.githubUsername, 'vidyalink-test-user');

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => mockGithubResponse({ followers: 43 }),
    });
    const synced = await githubService.sync(testUser._id);
    assert.equal(synced.followers, 43);

    const disconnected = await githubService.disconnect(testUser._id);
    assert.equal(disconnected.connectionStatus, 'Disconnected');

    await assert.rejects(
      () => githubService.connect(testUser._id, 'invalid username'),
      (error) => error.statusCode === 400
    );

    console.log('GitHub integration tests passed.');
  } finally {
    globalThis.fetch = previousFetch;
    if (testUser) {
      await GitHubAccount.deleteOne({ userId: testUser._id });
      await User.deleteOne({ _id: testUser._id });
    }
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error('GitHub integration tests failed:', error);
  process.exitCode = 1;
});
