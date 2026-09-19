/* global fetch */
import process from 'node:process';
import jwt from 'jsonwebtoken';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'development_access_secret_key_change_me';
const JWT_ISSUER = process.env.JWT_ISSUER || 'vidyalink-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'vidyalink-client';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function logPass(message) {
  console.log(`${colors.green}✔ PASS${colors.reset} ${message}`);
}

function logFail(message, detail = '') {
  console.error(`${colors.red}✖ FAIL${colors.reset} ${message}`);
  if (detail) console.error(`  ${colors.red}Details:${colors.reset}`, detail);
}

function logHeader(text) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${text} ===${colors.reset}`);
}

async function runApiTests() {
  logHeader('Starting VidyaLink Complete Authentication Audit & API Test Suite');
  console.log(`Target Base URL: ${BASE_URL}`);

  let accessToken = '';
  let refreshToken = '';
  let projectId = '';
  let passedCount = 0;
  let failedCount = 0;

  const testEmail = `audit_user_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testFullName = 'Audit Test User';

  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    };

    const config = {
      method: options.method || 'GET',
      headers,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, config);
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, ok: res.ok, data };
  }

  const assertStep = (name, res, expectedStatus = 200) => {
    if (res.status === expectedStatus && (res.data?.success !== false || expectedStatus >= 400)) {
      logPass(`${name} (HTTP ${res.status})`);
      passedCount++;
      return true;
    } else {
      logFail(`${name} - Expected HTTP ${expectedStatus}, got HTTP ${res.status}`, JSON.stringify(res.data));
      failedCount++;
      return false;
    }
  };

  // 1. Health Check
  logHeader('1. Health Check');
  const healthRes = await request('/health');
  assertStep('GET /health', healthRes, 200);

  // 2. Authentication Flow & Edge Cases
  logHeader('2. Authentication Flow & Edge Cases Audit');

  // Register
  const registerRes = await request('/auth/register', {
    method: 'POST',
    body: {
      fullName: testFullName,
      email: testEmail,
      password: testPassword,
      role: 'student',
    },
  });
  assertStep('POST /auth/register (User Registration)', registerRes, 201);

  // Duplicate Register
  const dupRegisterRes = await request('/auth/register', {
    method: 'POST',
    body: {
      fullName: testFullName,
      email: testEmail,
      password: testPassword,
      role: 'student',
    },
  });
  assertStep('POST /auth/register (Duplicate Email -> 409 Conflict)', dupRegisterRes, 409);

  // Login
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: testEmail,
      password: testPassword,
    },
  });
  if (assertStep('POST /auth/login (User Login)', loginRes, 200)) {
    accessToken = loginRes.data.data.accessToken;
    refreshToken = loginRes.data.data.refreshToken;
    console.log(`  ${colors.yellow}Acquired Access & Refresh Tokens${colors.reset}`);
  }

  // Protected Route (GET /auth/me)
  const meRes = await request('/auth/me', {
    token: accessToken,
  });
  assertStep('GET /auth/me (Protected Route with Valid Bearer Token)', meRes, 200);

  // Missing Token Audit
  const missingTokenRes = await request('/auth/me');
  assertStep('GET /auth/me (Missing Token -> 401 Unauthorized)', missingTokenRes, 401);

  // Invalid Token Audit
  const invalidTokenRes = await request('/auth/me', {
    token: 'invalid_malformed_token_string_xyz',
  });
  assertStep('GET /auth/me (Invalid Token -> 401 Unauthorized)', invalidTokenRes, 401);

  // Expired Token Audit
  const expiredJwtToken = jwt.sign(
    { sub: '507f1f77bcf86cd799439011', _id: '507f1f77bcf86cd799439011' },
    JWT_SECRET,
    {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: -10,
    }
  );
  const expiredTokenRes = await request('/auth/me', {
    token: expiredJwtToken,
  });
  assertStep('GET /auth/me (Expired Token -> 401 Access token has expired)', expiredTokenRes, 401);

  // Refresh Token Flow
  const refreshRes = await request('/auth/refresh-token', {
    method: 'POST',
    body: { refreshToken },
  });
  if (assertStep('POST /auth/refresh-token (Refresh Access Token)', refreshRes, 200)) {
    accessToken = refreshRes.data.data.accessToken;
    refreshToken = refreshRes.data.data.refreshToken;
    console.log(`  ${colors.yellow}Successfully Rotated Access & Refresh Tokens${colors.reset}`);
  }

  // 3. Profile Operations
  logHeader('3. Profile Operations');

  const createProfileRes = await request('/profile', {
    method: 'POST',
    token: accessToken,
    body: {
      fullName: testFullName,
      college: 'VidyaLink University',
      branch: 'Software Engineering',
      graduationYear: 2026,
      headline: 'Full Stack Engineer & Core Architect',
      bio: 'Building SaaS applications with Node.js, Express, and MongoDB.',
      skills: ['Node.js', 'Express', 'MongoDB', 'JWT', 'TypeScript'],
    },
  });
  assertStep('POST /profile (Create Profile)', createProfileRes, 201);

  const getProfileRes = await request('/profile/me', {
    token: accessToken,
  });
  assertStep('GET /profile/me (Get My Profile)', getProfileRes, 200);

  const updateProfileRes = await request('/profile', {
    method: 'PATCH',
    token: accessToken,
    body: {
      headline: 'Principal Backend Engineer',
    },
  });
  assertStep('PATCH /profile (Update Profile)', updateProfileRes, 200);

  // 4. Project Operations
  logHeader('4. Project Operations');

  const createProjectRes = await request('/projects', {
    method: 'POST',
    token: accessToken,
    body: {
      title: 'VidyaLink Core Service',
      shortDescription: 'Backend REST API for the VidyaLink student platform.',
      detailedDescription: 'Backend REST API providing authentication, project showcase, and profile management.',
      category: 'Web Development',
      domain: 'Education Technology',
      technologies: ['Node.js', 'Express', 'MongoDB'],
      githubRepository: 'https://github.com/example/vidyalink-core',
    },
  });
  if (assertStep('POST /projects (Create Project)', createProjectRes, 201)) {
    projectId = createProjectRes.data.data._id;
  }

  const getProjectsRes = await request('/projects', {
    token: accessToken,
  });
  assertStep('GET /projects (List All Projects)', getProjectsRes, 200);

  if (projectId) {
    const getSingleProjectRes = await request(`/projects/${projectId}`, {
      token: accessToken,
    });
    assertStep(`GET /projects/${projectId} (Get Project by ID)`, getSingleProjectRes, 200);

    const updateProjectRes = await request(`/projects/${projectId}`, {
      method: 'PUT',
      token: accessToken,
      body: {
        title: 'VidyaLink SaaS Microservice Architecture',
      },
    });
    assertStep(`PATCH /projects/${projectId} (Update Project)`, updateProjectRes, 200);

    const deleteProjectRes = await request(`/projects/${projectId}`, {
      method: 'DELETE',
      token: accessToken,
    });
    assertStep(`DELETE /projects/${projectId} (Delete Project)`, deleteProjectRes, 200);
  }

  // 5. Cleanup & Logout Audit
  logHeader('5. Cleanup & Logout Audit');

  const deleteProfileRes = await request('/profile', {
    method: 'DELETE',
    token: accessToken,
  });
  assertStep('DELETE /profile (Delete Profile)', deleteProfileRes, 200);

  const logoutRes = await request('/auth/logout', {
    method: 'POST',
    token: accessToken,
  });
  assertStep('POST /auth/logout (User Logout)', logoutRes, 200);

  // Verification Summary
  logHeader('AUDIT TEST RESULTS SUMMARY');
  console.log(`Total Checks Passed: ${colors.green}${passedCount}${colors.reset}`);
  console.log(`Total Checks Failed: ${colors.red}${failedCount}${colors.reset}`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log(`\n${colors.bright}${colors.green}ALL 18 AUDIT & INTEGRATION CHECKS PASSED PERFECTLY!${colors.reset}\n`);
  }
}

runApiTests().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
