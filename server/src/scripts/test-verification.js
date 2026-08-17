/* global fetch */
/**
 * Verification Service – Integration Test Suite
 *
 * Tests every endpoint defined in verification.routes.js:
 *   POST   /api/v1/verification/submit
 *   GET    /api/v1/verification/pending
 *   GET    /api/v1/verification/history
 *   GET    /api/v1/verification/:targetType/:targetId
 *   PATCH  /api/v1/verification/:id/approve
 *   PATCH  /api/v1/verification/:id/reject
 *   PATCH  /api/v1/verification/:id/request-changes
 *   GET    /api/v1/verification/student/:studentId/summary
 *   GET    /api/v1/verification/dashboard
 *   GET    /api/v1/verification/dashboard/:id
 *
 * Covers:
 *   - Happy-path flows (submit → approve / reject / request-changes)
 *   - Authorization failures (wrong role, missing token)
 *   - Duplicate verification request → 409 Conflict
 *   - Invalid targetType → 400 Validation error
 *   - Invalid ObjectId → 400 Validation error
 *   - Student cannot access faculty-only endpoints
 *   - Faculty cannot access student-only endpoints
 */
import process from 'node:process';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

// ─── Color helpers ──────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

let passed = 0;
let failed = 0;

function logHeader(text) {
  console.log(`\n${c.bright}${c.cyan}=== ${text} ===${c.reset}`);
}

function logPass(label, status) {
  console.log(`${c.green}✔ PASS${c.reset} ${label} ${c.dim}(HTTP ${status})${c.reset}`);
  passed++;
}

function logFail(label, expected, actual, body = '') {
  console.error(`${c.red}✖ FAIL${c.reset} ${label}`);
  console.error(`  ${c.red}Expected HTTP ${expected}, got HTTP ${actual}${c.reset}`);
  if (body) console.error(`  ${c.dim}Body: ${JSON.stringify(body).slice(0, 300)}${c.reset}`);
  failed++;
}

// ─── HTTP helper ────────────────────────────────────────────────────────────
async function request(path, { method = 'GET', token = null, body = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, ok: res.ok, data };
}

// ─── Assert helper ──────────────────────────────────────────────────────────
function assert(label, res, expectedStatus) {
  if (res.status === expectedStatus) {
    logPass(label, res.status);
    return true;
  }
  logFail(label, expectedStatus, res.status, res.data);
  return false;
}

// ─── Register + Login helper ────────────────────────────────────────────────
async function registerAndLogin(role) {
  const email = `test_${role}_${Date.now()}_${Math.random().toString(36).slice(2)}@vidyalink.test`;
  const password = 'Password123!';

  await request('/auth/register', {
    method: 'POST',
    body: { fullName: `Test ${role}`, email, password, role },
  });

  const login = await request('/auth/login', { method: 'POST', body: { email, password } });
  if (!login.ok) throw new Error(`Login failed for ${role}: ${JSON.stringify(login.data)}`);

  const { accessToken } = login.data.data;
  const userId = login.data.data.user?._id || login.data.data.user?.id;
  return { token: accessToken, userId, email };
}

// ─── Create a project for a student (needed as a verification target) ────────
async function createProject(token) {
  const res = await request('/projects', {
    method: 'POST',
    token,
    body: {
      title: `Verification Test Project ${Date.now()}`,
      shortDescription: 'A project used for verification testing.',
      detailedDescription: 'Full description of the verification test project.',
      category: 'Web Development',
      domain: 'Education Technology',
      technologies: ['Node.js'],
    },
  });
  if (!res.ok) throw new Error(`Project creation failed: ${JSON.stringify(res.data)}`);
  return res.data.data._id;
}

// ─── Create a profile for a student (needed for PROFILE target) ─────────────
async function createProfile(token) {
  const res = await request('/profile', {
    method: 'POST',
    token,
    body: {
      fullName: 'Verification Student',
      college: 'VidyaLink University',
      branch: 'Computer Science',
      graduationYear: 2026,
      headline: 'Student Developer',
      bio: 'Testing the verification service.',
      skills: ['Node.js'],
    },
  });
  // 201 = created, 409 = already exists (profile may already exist)
  if (res.status !== 201 && res.status !== 409) {
    throw new Error(`Profile creation failed: ${JSON.stringify(res.data)}`);
  }
  // GET the profile to extract its ID
  const getRes = await request('/profile/me', { token });
  if (!getRes.ok) throw new Error(`Profile fetch failed: ${JSON.stringify(getRes.data)}`);
  return getRes.data.data._id;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN TEST SUITE
// ════════════════════════════════════════════════════════════════════════════
async function runTests() {
  logHeader('VidyaLink – Verification Service Integration Test Suite');
  console.log(`Target: ${BASE_URL}\n`);

  // ── Setup: register actors ──────────────────────────────────────────────
  logHeader('0. Test Actor Setup');

  const student = await registerAndLogin('student');
  console.log(`  ${c.yellow}Student token acquired (id: ${student.userId})${c.reset}`);

  const student2 = await registerAndLogin('student');
  console.log(`  ${c.yellow}Student2 token acquired${c.reset}`);

  const faculty = await registerAndLogin('faculty');
  console.log(`  ${c.yellow}Faculty token acquired (id: ${faculty.userId})${c.reset}`);

  // Create a project owned by student
  const projectId = await createProject(student.token);
  console.log(`  ${c.yellow}Project created (id: ${projectId})${c.reset}`);

  // Create profile for student (needed for PROFILE target type)
  let profileId;
  try {
    profileId = await createProfile(student.token);
    console.log(`  ${c.yellow}Profile id: ${profileId}${c.reset}`);
  } catch (e) {
    console.log(`  ${c.dim}Profile setup skipped: ${e.message}${c.reset}`);
  }

  let verificationId = null;
  let profileVerificationId = null;

  // ════════════════════════════════════════════════════════════════════════
  // 1. SUBMIT VERIFICATION
  // ════════════════════════════════════════════════════════════════════════
  logHeader('1. POST /verification/submit');

  // 1a. Student submits valid PROJECT verification
  const submitRes = await request('/verification/submit', {
    method: 'POST',
    token: student.token,
    body: { targetType: 'PROJECT', targetId: projectId },
  });
  if (assert('Submit PROJECT verification (student)', submitRes, 201)) {
    verificationId = submitRes.data.data._id;
  }

  // 1b. Duplicate submit → 409
  const dupRes = await request('/verification/submit', {
    method: 'POST',
    token: student.token,
    body: { targetType: 'PROJECT', targetId: projectId },
  });
  assert('Duplicate verification request → 409 Conflict', dupRes, 409);

  // 1c. Invalid targetType → 400
  const badTypeRes = await request('/verification/submit', {
    method: 'POST',
    token: student.token,
    body: { targetType: 'INVALID_TYPE', targetId: projectId },
  });
  assert('Invalid targetType → 400 Validation Error', badTypeRes, 400);

  // 1d. Invalid ObjectId for targetId → 400
  const badIdRes = await request('/verification/submit', {
    method: 'POST',
    token: student.token,
    body: { targetType: 'PROJECT', targetId: 'not-an-objectid' },
  });
  assert('Invalid targetId (not ObjectId) → 400 Validation Error', badIdRes, 400);

  // 1e. Faculty cannot submit → 403
  const facultySubmitRes = await request('/verification/submit', {
    method: 'POST',
    token: faculty.token,
    body: { targetType: 'PROJECT', targetId: projectId },
  });
  assert('Faculty tries to submit verification → 403 Forbidden', facultySubmitRes, 403);

  // 1f. Missing token → 401
  const noTokenSubmitRes = await request('/verification/submit', {
    method: 'POST',
    body: { targetType: 'PROJECT', targetId: projectId },
  });
  assert('Submit without auth token → 401 Unauthorized', noTokenSubmitRes, 401);

  // 1g. Student cannot submit for another student's project → 404
  const otherStudentSubmitRes = await request('/verification/submit', {
    method: 'POST',
    token: student2.token,
    body: { targetType: 'PROJECT', targetId: projectId },
  });
  assert("Submit verification for another student's project → 404 Not Found", otherStudentSubmitRes, 404);

  // 1h. Profile target (if profile was created)
  if (profileId) {
    const profileSubmitRes = await request('/verification/submit', {
      method: 'POST',
      token: student.token,
      body: { targetType: 'PROFILE', targetId: profileId, remarks: 'Please verify my profile.' },
    });
    if (assert('Submit PROFILE verification with remarks (student)', profileSubmitRes, 201)) {
      profileVerificationId = profileSubmitRes.data.data._id;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. GET /verification/pending
  // ════════════════════════════════════════════════════════════════════════
  logHeader('2. GET /verification/pending');

  const pendingRes = await request('/verification/pending', { token: faculty.token });
  assert('Faculty gets pending verifications', pendingRes, 200);

  // Student cannot access pending list → 403
  const studentPendingRes = await request('/verification/pending', { token: student.token });
  assert('Student tries to access pending list → 403 Forbidden', studentPendingRes, 403);

  // No token → 401
  const noPendingRes = await request('/verification/pending');
  assert('No token for pending list → 401 Unauthorized', noPendingRes, 401);

  // ════════════════════════════════════════════════════════════════════════
  // 3. GET /verification/history
  // ════════════════════════════════════════════════════════════════════════
  logHeader('3. GET /verification/history');

  const historyRes = await request('/verification/history', { token: student.token });
  assert('Student gets own verification history', historyRes, 200);

  // With targetType filter
  const filteredHistRes = await request('/verification/history?targetType=PROJECT', { token: student.token });
  assert('Student gets history filtered by targetType=PROJECT', filteredHistRes, 200);

  // targetId without targetType → 400
  const badHistoryRes = await request(`/verification/history?targetId=${projectId}`, { token: student.token });
  assert('History with targetId but no targetType → 400', badHistoryRes, 400);

  // Faculty cannot access student history endpoint → 403
  const facultyHistRes = await request('/verification/history', { token: faculty.token });
  assert('Faculty tries student history endpoint → 403 Forbidden', facultyHistRes, 403);

  // ════════════════════════════════════════════════════════════════════════
  // 4. GET /verification/:targetType/:targetId
  // ════════════════════════════════════════════════════════════════════════
  logHeader('4. GET /verification/:targetType/:targetId');

  const statusRes = await request(`/verification/PROJECT/${projectId}`, { token: student.token });
  assert('Student gets verification status for own PROJECT', statusRes, 200);

  // Invalid targetType in params → 400
  const badParamRes = await request(`/verification/FOOBAR/${projectId}`, { token: student.token });
  assert('Invalid targetType in params → 400 Validation Error', badParamRes, 400);

  // Faculty cannot access student status endpoint → 403
  const facultyStatusRes = await request(`/verification/PROJECT/${projectId}`, { token: faculty.token });
  assert('Faculty tries student status endpoint → 403 Forbidden', facultyStatusRes, 403);

  // ════════════════════════════════════════════════════════════════════════
  // 5. PATCH /verification/:id/approve
  // ════════════════════════════════════════════════════════════════════════
  logHeader('5. PATCH /verification/:id/approve');

  if (verificationId) {
    const approveRes = await request(`/verification/${verificationId}/approve`, {
      method: 'PATCH',
      token: faculty.token,
      body: { remarks: 'Looks good! Project is verified.' },
    });
    assert('Faculty approves verification', approveRes, 200);

    // Student cannot approve → 403
    const studentApproveRes = await request(`/verification/${verificationId}/approve`, {
      method: 'PATCH',
      token: student.token,
      body: {},
    });
    assert('Student tries to approve → 403 Forbidden', studentApproveRes, 403);

    // Approve a non-PENDING request again (should 409 for non-admin)
    const doubleApproveRes = await request(`/verification/${verificationId}/approve`, {
      method: 'PATCH',
      token: faculty.token,
      body: {},
    });
    assert('Double-approve non-PENDING request → 409 Conflict', doubleApproveRes, 409);

    // Invalid verification ID format → 400
    const badApproveRes = await request('/verification/invalid-id/approve', {
      method: 'PATCH',
      token: faculty.token,
      body: {},
    });
    assert('Approve with invalid ID format → 400 Validation Error', badApproveRes, 400);

    // Non-existent verification ID → 404
    const notFoundApproveRes = await request('/verification/507f1f77bcf86cd799439099/approve', {
      method: 'PATCH',
      token: faculty.token,
      body: {},
    });
    assert('Approve non-existent verification → 404 Not Found', notFoundApproveRes, 404);
  } else {
    console.log(`  ${c.yellow}⚠ Skipping approve tests (no verificationId available)${c.reset}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // 6. PATCH /verification/:id/reject
  // ════════════════════════════════════════════════════════════════════════
  logHeader('6. PATCH /verification/:id/reject');

  if (profileVerificationId) {
    // Missing required remarks → 400
    const rejectNoRemarksRes = await request(`/verification/${profileVerificationId}/reject`, {
      method: 'PATCH',
      token: faculty.token,
      body: {},
    });
    assert('Reject without required remarks → 400 Validation Error', rejectNoRemarksRes, 400);

    // Successful reject with remarks
    const rejectRes = await request(`/verification/${profileVerificationId}/reject`, {
      method: 'PATCH',
      token: faculty.token,
      body: { remarks: 'Profile is incomplete. Please add your academic details.' },
    });
    assert('Faculty rejects PROFILE verification with remarks', rejectRes, 200);

    // Student cannot reject → 403
    const studentRejectRes = await request(`/verification/${profileVerificationId}/reject`, {
      method: 'PATCH',
      token: student.token,
      body: { remarks: 'I reject my own submission.' },
    });
    assert('Student tries to reject → 403 Forbidden', studentRejectRes, 403);
  } else {
    console.log(`  ${c.yellow}⚠ Skipping reject tests (no profileVerificationId available)${c.reset}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // 7. PATCH /verification/:id/request-changes
  // ════════════════════════════════════════════════════════════════════════
  logHeader('7. PATCH /verification/:id/request-changes');

  // Submit a fresh verification to test request-changes
  const submitForChanges = await request('/verification/submit', {
    method: 'POST',
    token: student.token,
    body: { targetType: 'PROJECT', targetId: projectId },
  });

  let changesVerificationId = null;
  if (submitForChanges.status === 201) {
    changesVerificationId = submitForChanges.data.data._id;
  }

  if (changesVerificationId) {
    // Missing required remarks → 400
    const noRemarksRes = await request(`/verification/${changesVerificationId}/request-changes`, {
      method: 'PATCH',
      token: faculty.token,
      body: {},
    });
    assert('Request changes without remarks → 400 Validation Error', noRemarksRes, 400);

    // Successful request-changes
    const changesRes = await request(`/verification/${changesVerificationId}/request-changes`, {
      method: 'PATCH',
      token: faculty.token,
      body: { remarks: 'Please add a live demo link and update the tech stack.' },
    });
    assert('Faculty requests changes on verification', changesRes, 200);

    // Student cannot request changes → 403
    const studentChangesRes = await request(`/verification/${changesVerificationId}/request-changes`, {
      method: 'PATCH',
      token: student.token,
      body: { remarks: 'Let me change my own submission.' },
    });
    assert('Student tries request-changes → 403 Forbidden', studentChangesRes, 403);
  } else {
    console.log(`  ${c.yellow}⚠ Skipping request-changes tests (no fresh PENDING verification)${c.reset}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // 8. GET /verification/student/:studentId/summary
  // ════════════════════════════════════════════════════════════════════════
  logHeader('8. GET /verification/student/:studentId/summary');

  // Faculty can view student summary
  const summaryRes = await request(`/verification/student/${student.userId}/summary`, {
    token: faculty.token,
  });
  assert('Faculty gets student verification summary', summaryRes, 200);

  // Student can view own summary
  const ownSummaryRes = await request(`/verification/student/${student.userId}/summary`, {
    token: student.token,
  });
  assert('Student views own verification summary', ownSummaryRes, 200);

  // Invalid studentId format → 400
  const badSummaryRes = await request('/verification/student/not-an-id/summary', {
    token: faculty.token,
  });
  assert('Invalid studentId format → 400 Validation Error', badSummaryRes, 400);

  // No token → 401
  const noTokenSummaryRes = await request(`/verification/student/${student.userId}/summary`);
  assert('No token for summary → 401 Unauthorized', noTokenSummaryRes, 401);

  // ════════════════════════════════════════════════════════════════════════
  // 9. GET /verification/dashboard  (faculty dashboard)
  // ════════════════════════════════════════════════════════════════════════
  logHeader('9. GET /verification/dashboard');

  const dashRes = await request('/verification/dashboard', { token: faculty.token });
  assert('Faculty gets verification dashboard', dashRes, 200);

  // With query filters
  const filteredDashRes = await request('/verification/dashboard?status=PENDING&sort=HIGHEST_PRIORITY', {
    token: faculty.token,
  });
  assert('Faculty dashboard with status+sort filters', filteredDashRes, 200);

  // Invalid status filter → 400
  const badDashRes = await request('/verification/dashboard?status=UNKNOWN', { token: faculty.token });
  assert('Dashboard with invalid status filter → 400', badDashRes, 400);

  // Student cannot access dashboard → 403
  const studentDashRes = await request('/verification/dashboard', { token: student.token });
  assert('Student tries dashboard → 403 Forbidden', studentDashRes, 403);

  // ════════════════════════════════════════════════════════════════════════
  // 10. GET /verification/dashboard/:id  (faculty detail)
  // ════════════════════════════════════════════════════════════════════════
  logHeader('10. GET /verification/dashboard/:id');

  if (verificationId) {
    const detailRes = await request(`/verification/dashboard/${verificationId}`, {
      token: faculty.token,
    });
    assert('Faculty gets verification detail by id', detailRes, 200);

    // Invalid ID → 400
    const badDetailRes = await request('/verification/dashboard/bad-id', { token: faculty.token });
    assert('Dashboard detail with invalid id → 400 Validation Error', badDetailRes, 400);

    // Non-existent ID → 404
    const missingDetailRes = await request('/verification/dashboard/507f1f77bcf86cd799439099', {
      token: faculty.token,
    });
    assert('Dashboard detail for non-existent id → 404 Not Found', missingDetailRes, 404);

    // Student cannot access → 403
    const studentDetailRes = await request(`/verification/dashboard/${verificationId}`, {
      token: student.token,
    });
    assert('Student tries dashboard detail → 403 Forbidden', studentDetailRes, 403);
  } else {
    console.log(`  ${c.yellow}⚠ Skipping dashboard detail tests (no verificationId)${c.reset}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════════════
  logHeader('TEST RESULTS SUMMARY');
  console.log(`Total Tests Run : ${passed + failed}`);
  console.log(`${c.green}Passed          : ${passed}${c.reset}`);
  console.log(`${c.red}Failed          : ${failed}${c.reset}`);

  if (failed > 0) {
    console.error(`\n${c.red}${c.bright}${failed} test(s) FAILED. Review the output above.${c.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${c.green}${c.bright}ALL ${passed} TESTS PASSED!${c.reset}\n`);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during verification test suite:', err);
  process.exit(1);
});
