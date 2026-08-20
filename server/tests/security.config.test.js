import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { createApp } from '../src/app.js';
import {
  createEnvironment,
  EnvironmentConfigurationError,
} from '../src/config/env.js';
import { createGithubHeaders, fetchGithubProfile } from '../src/services/github.service.js';
import { createLogger, redactSensitiveData } from '../src/utils/logger.js';

const requiredValues = Object.freeze({
  NODE_ENV: 'test',
  PORT: '5000',
  MONGODB_URI: 'mongodb://localhost:27017/vidyalink-test',
  JWT_SECRET: 'test-access-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
});

test('reports every missing required environment variable without values', () => {
  assert.throws(
    () => createEnvironment({ NODE_ENV: 'test', JWT_SECRET: 'must-not-appear' }),
    (error) => {
      assert.ok(error instanceof EnvironmentConfigurationError);
      assert.deepEqual(error.missing, [
        'PORT',
        'MONGODB_URI',
        'JWT_REFRESH_SECRET',
        'JWT_EXPIRES_IN',
        'JWT_REFRESH_EXPIRES_IN',
      ]);
      assert.match(error.message, /ENVIRONMENT CONFIGURATION ERROR/);
      assert.doesNotMatch(error.message, /must-not-appear/);
      return true;
    }
  );
});

test('builds a validated, server-only configuration object', () => {
  const configuration = createEnvironment({
    ...requiredValues,
    GITHUB_TOKEN: 'test-github-token',
    GEMINI_API_KEY: 'test-gemini-key',
    EMAIL_PORT: '587',
  });

  assert.equal(configuration.port, 5000);
  assert.equal(configuration.jwt.secret, 'test-access-secret');
  assert.equal(configuration.github.token, 'test-github-token');
  assert.equal(configuration.ai.geminiApiKey, 'test-gemini-key');
  assert.equal(configuration.email.port, 587);
  assert.ok(Object.isFrozen(configuration));
  assert.ok(Object.isFrozen(configuration.jwt));
});

test('builds a GitHub Bearer authorization header only when a caller supplies a token', () => {
  assert.equal(createGithubHeaders().Authorization, undefined);
  assert.equal(createGithubHeaders('test-github-token').Authorization, 'Bearer test-github-token');
});

test('uses no private credential for public GitHub profile requests', async () => {
  const previousFetch = globalThis.fetch;
  let requestOptions;

  globalThis.fetch = async (_url, options) => {
    requestOptions = options;
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        login: 'octocat',
        html_url: 'https://github.com/octocat',
        followers: 0,
        following: 0,
        public_repos: 0,
        public_gists: 0,
      }),
    };
  };

  try {
    await fetchGithubProfile('octocat');
    assert.equal(requestOptions.headers.Authorization, undefined);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('returns a safe error for an invalid GitHub API response', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    headers: new Headers(),
  });

  try {
    await assert.rejects(
      () => fetchGithubProfile('octocat'),
      (error) => error.statusCode === 500 && error.message === 'GitHub API request failed'
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('redacts secrets before writing structured logs', () => {
  const output = [];
  const logger = createLogger({
    error: (...items) => output.push(items),
    log: (...items) => output.push(items),
  });

  logger.error('Upstream request failed', {
    authorization: 'Bearer test-access-token',
    password: 'test-password',
    mongoUri: 'mongodb://db-user:test-database-password@localhost:27017/vidyalink',
  });

  const renderedOutput = JSON.stringify(output);
  assert.doesNotMatch(renderedOutput, /test-access-token|test-password|test-database-password/);
  assert.match(renderedOutput, /\[REDACTED\]/);

  const serializedResponse = JSON.stringify({ refreshToken: 'test-refresh-token' });
  assert.doesNotMatch(redactSensitiveData(serializedResponse), /test-refresh-token/);
});

test('health responses do not expose server configuration or external API keys', async () => {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.doesNotMatch(body, /GITHUB_TOKEN|GEMINI_API_KEY|OPENAI_API_KEY|CLOUDINARY_API_SECRET|EMAIL_PASSWORD/i);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  }));
  return nested.flat();
};

test('client source does not reference server API-key environment variables', async () => {
  const clientSourceDirectory = path.resolve('..', 'client', 'src');
  const sourceFiles = (await listFiles(clientSourceDirectory))
    .filter((file) => /\.(js|jsx)$/.test(file));
  const source = await Promise.all(sourceFiles.map((file) => readFile(file, 'utf8')));

  assert.doesNotMatch(
    source.join('\n'),
    /GITHUB_TOKEN|GITHUB_CLIENT_SECRET|GEMINI_API_KEY|OPENAI_API_KEY|CLOUDINARY_API_SECRET|EMAIL_PASSWORD|JWT_SECRET|MONGODB_URI/
  );
});
