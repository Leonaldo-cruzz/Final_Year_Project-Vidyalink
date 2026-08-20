import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiPath } from '../helpers/api.js';
import { loginUser } from '../helpers/auth.js';
import { fetchGithubProfile } from '../../src/services/github.service.js';

const githubProfile = {
  login: 'octocat',
  html_url: 'https://github.com/octocat',
  avatar_url: 'https://avatars.githubusercontent.com/u/583231',
  name: 'The Octocat',
  bio: 'A test profile',
  followers: 100,
  following: 10,
  public_repos: 8,
  public_gists: 1,
  created_at: '2011-01-25T18:44:36Z',
};

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('GitHub API', () => {
  it('connects, gets, syncs, and disconnects a public GitHub profile without credentials', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => githubProfile });
    const session = await loginUser();
    const authorization = { Authorization: `Bearer ${session.token}` };
    const connected = await session.agent.post(apiPath('/github/connect')).set(authorization).send({ githubUsername: '@octocat' });
    const fetched = await session.agent.get(apiPath('/github/profile')).set(authorization);
    const synced = await session.agent.post(apiPath('/github/sync')).set(authorization);
    const disconnected = await session.agent.delete(apiPath('/github/disconnect')).set(authorization);

    expect(connected.status).toBe(201);
    expect(connected.body.data.githubUsername).toBe('octocat');
    expect(fetched.status).toBe(200);
    expect(synced.status).toBe(200);
    expect(disconnected.body.data.connectionStatus).toBe('Disconnected');
    expect(JSON.stringify(connected.body)).not.toMatch(/token|secret|authorization/i);
  });

  it('validates usernames and maps external API failures without leaking details', async () => {
    const session = await loginUser();
    const authorization = { Authorization: `Bearer ${session.token}` };
    const invalidUsername = await session.agent.post(apiPath('/github/connect')).set(authorization).send({ githubUsername: 'invalid username!' });

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const failure = await session.agent.post(apiPath('/github/connect')).set(authorization).send({ githubUsername: 'octocat' });

    expect(invalidUsername.status).toBe(400);
    expect(failure.status).toBe(500);
    expect(failure.body.message).toBe('GitHub could not return this profile right now');
    expect(JSON.stringify(failure.body)).not.toMatch(/api\.github\.com|authorization/i);
  });

  it('maps GitHub request timeouts to a safe API error', async () => {
    global.fetch = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    await expect(fetchGithubProfile('octocat')).rejects.toMatchObject({
      statusCode: 500,
      message: 'GitHub profile request timed out',
    });
  });
});
