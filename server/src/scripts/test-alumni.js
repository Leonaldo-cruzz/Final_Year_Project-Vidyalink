/**
 * VIDYALINK — Alumni Backend Integration Test Suite
 *
 * Run with:   node server/src/scripts/test-alumni.js
 * Requires:   server running at API_BASE_URL (default: http://localhost:5000/api/v1)
 *
 * The suite registers fresh test users on every run so it is safe to run
 * repeatedly against a local development database.
 */

import process from 'node:process';
import mongoose from 'mongoose';
import env from '../config/env.js';
import User from '../models/user.model.js';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

// ─── Console helpers ─────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

let passed = 0;
let failed = 0;

function logHeader(text) {
  console.log(`\n${C.bright}${C.cyan}=== ${text} ===${C.reset}`);
}

function logPass(msg) {
  console.log(`${C.green}✔ PASS${C.reset} ${msg}`);
  passed++;
}

function logFail(msg, detail = '') {
  console.error(`${C.red}✖ FAIL${C.reset} ${msg}`);
  if (detail) console.error(`  ${C.red}Detail:${C.reset}`, detail);
  failed++;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function api(endpoint, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, ok: res.ok, data };
}

function assert(label, res, expectedStatus) {
  if (res.status === expectedStatus) {
    logPass(`${label} → HTTP ${res.status}`);
    return true;
  }
  logFail(`${label} → Expected HTTP ${expectedStatus}, got ${res.status}`, JSON.stringify(res.data));
  return false;
}

// ─── User factory ─────────────────────────────────────────────────────────────

const ts = Date.now();

const USERS = {
  alumni: {
    fullName: 'Test Alumni User',
    email: `alumni_${ts}@vidyalink.test`,
    password: 'Alumni@1234',
    role: 'alumni',
  },
  alumni2: {
    fullName: 'Second Alumni User',
    email: `alumni2_${ts}@vidyalink.test`,
    password: 'Alumni@1234',
    role: 'alumni',
  },
  student: {
    fullName: 'Test Student User',
    email: `student_${ts}@vidyalink.test`,
    password: 'Student@1234',
    role: 'student',
  },
  student2: {
    fullName: 'Second Student User',
    email: `student2_${ts}@vidyalink.test`,
    password: 'Student@1234',
    role: 'student',
  },
  admin: {
    fullName: 'Test Admin User',
    email: `admin_${ts}@vidyalink.test`,
    password: 'Admin@12345',
    role: 'admin',
  },
};

async function register(user) {
  const res = await api('/auth/register', { method: 'POST', body: user });
  return res;
}

async function login(email, password) {
  const res = await api('/auth/login', { method: 'POST', body: { email, password } });
  return res?.data?.data?.accessToken;
}

// ─── Main test runner ─────────────────────────────────────────────────────────

async function run() {
  logHeader('VIDYALINK Alumni Backend Integration Test Suite');
  console.log(`Target: ${BASE_URL}\n`);

  try {
    // ── 0. Setup — register and login test users ──────────────────────────────

    logHeader('0. Setup — Register Test Users');

    await mongoose.connect(env.MONGODB_URI);
    logPass('MongoDB Connected for test setup');

    for (const [key, user] of Object.entries(USERS)) {
      if (user.role === 'admin') {
        // Admin accounts are provisioned directly in database per security design
        let adminUser = await User.findOne({ email: user.email });
        if (!adminUser) {
          adminUser = await User.create({
            fullName: user.fullName,
            email: user.email,
            password: user.password,
            role: 'admin',
            status: 'active',
          });
          logPass(`Created test admin user: ${adminUser.email}`);
        } else {
          logPass(`Using existing test admin user: ${adminUser.email}`);
        }
        continue;
      }

      const res = await register(user);
      if (res.status === 201 || res.status === 409) {
        logPass(`Registered / already exists: ${key} (${user.email})`);
      } else {
        logFail(`Failed to register ${key}`, JSON.stringify(res.data));
      }
    }

    const tokens = {};
    for (const [key, user] of Object.entries(USERS)) {
      tokens[key] = await login(user.email, user.password);
      if (tokens[key]) {
        logPass(`Logged in: ${key}`);
      } else {
        logFail(`Login failed: ${key}`);
      }
    }

    // Set up alumni2 with unverified profile for testing unverified restrictions
    if (tokens.alumni2) {
      await api('/alumni/profile', {
        method: 'POST',
        token: tokens.alumni2,
        body: {
          company: 'Beta Corp',
          designation: 'Software Developer',
          industry: 'Technology',
        },
      });
    }

  // IDs we'll collect along the way
  let alumniUserId = null;
  let studentUserId = null;
  let studentUserId2 = null;
  let mentorshipRequestId = null;
  let endorsementId = null;
  let referralId = null;
  let mockInterviewId = null;

  // Capture user IDs from /auth/me
  const meAlumni = await api('/auth/me', { token: tokens.alumni });
  alumniUserId = meAlumni.data?.data?.user?._id || meAlumni.data?.data?._id;

  const meStudent = await api('/auth/me', { token: tokens.student });
  studentUserId = meStudent.data?.data?.user?._id || meStudent.data?.data?._id;

  const meStudent2 = await api('/auth/me', { token: tokens.student2 });
  studentUserId2 = meStudent2.data?.data?.user?._id || meStudent2.data?.data?._id;

  console.log(`  Alumni ID: ${alumniUserId}`);
  console.log(`  Student ID: ${studentUserId}`);

  // ── 1. Alumni Profile ─────────────────────────────────────────────────────

  logHeader('1. Alumni Profile');

  // Create profile
  const createProfileRes = await api('/alumni/profile', {
    method: 'POST',
    token: tokens.alumni,
    body: {
      company: 'Acme Corp',
      designation: 'Senior Engineer',
      industry: 'Technology',
      experienceYears: 5,
      bio: 'Experienced backend engineer.',
      skills: ['Node.js', 'MongoDB', 'React'],
      linkedinUrl: 'https://linkedin.com/in/test-alumni',
      location: 'Pune, India',
    },
  });
  assert('POST /alumni/profile (create)', createProfileRes, 201);

  // Duplicate create → 409
  const dupProfileRes = await api('/alumni/profile', {
    method: 'POST',
    token: tokens.alumni,
    body: { company: 'Duplicate Corp' },
  });
  assert('POST /alumni/profile (duplicate → 409)', dupProfileRes, 409);

  // Get own profile
  const getProfileRes = await api('/alumni/profile', { token: tokens.alumni });
  assert('GET /alumni/profile', getProfileRes, 200);

  // Update profile
  const updateProfileRes = await api('/alumni/profile', {
    method: 'PATCH',
    token: tokens.alumni,
    body: { designation: 'Principal Engineer' },
  });
  assert('PATCH /alumni/profile', updateProfileRes, 200);

  // Student cannot access alumni profile endpoint
  const studentProfileRes = await api('/alumni/profile', { token: tokens.student });
  assert('GET /alumni/profile (student → 403)', studentProfileRes, 403);

  // ── 2. Unverified alumni restrictions ────────────────────────────────────

  logHeader('2. Unverified Alumni Restrictions');

  // Unverified alumni cannot create endorsements
  const unverifiedEndorseRes = await api('/alumni/endorsements', {
    method: 'POST',
    token: tokens.alumni,
    body: {
      studentId: studentUserId,
      skill: 'Node.js',
      message: 'Great skills!',
    },
  });
  assert('POST /alumni/endorsements (unverified → 403)', unverifiedEndorseRes, 403);

  // Unverified alumni cannot accept mentorship
  // (We need a mentorship request first — student creates one)
  if (alumniUserId) {
    const preReqRes = await api('/mentorship/requests', {
      method: 'POST',
      token: tokens.student,
      body: {
        alumniId: alumniUserId,
        topic: 'Career advice',
        message: 'I would love some career guidance from you!',
      },
    });
    // Expect 403 because alumni is not yet verified
    assert('POST /mentorship/requests to unverified alumni (→ 403)', preReqRes, 403);
  }

  // ── 3. Admin verifies the alumni ─────────────────────────────────────────

  logHeader('3. Admin Verifies Alumni');

  if (alumniUserId) {
    const verifyRes = await api(`/alumni/users/${alumniUserId}/verify`, {
      method: 'PATCH',
      token: tokens.admin,
      body: { isVerified: true },
    });
    assert('PATCH /alumni/users/:id/verify (admin)', verifyRes, 200);

    // Verify that the profile now shows isVerified = true
    const verifiedProfileRes = await api('/alumni/profile', { token: tokens.alumni });
    const isVerified = verifiedProfileRes.data?.data?.profile?.isVerified;
    if (isVerified === true) {
      logPass('Profile isVerified = true after admin verification');
      passed++;
    } else {
      logFail('Profile isVerified should be true after verification', JSON.stringify(verifiedProfileRes.data));
    }
  }

  // ── 4. Mentorship Requests ───────────────────────────────────────────────

  logHeader('4. Mentorship Requests');

  // Student creates a mentorship request (alumni now verified)
  if (alumniUserId) {
    const mentorReqRes = await api('/mentorship/requests', {
      method: 'POST',
      token: tokens.student,
      body: {
        alumniId: alumniUserId,
        topic: 'Career guidance for backend roles',
        message: 'I am a final year student seeking guidance on breaking into backend engineering.',
      },
    });
    if (assert('POST /mentorship/requests (student → verified alumni)', mentorReqRes, 201)) {
      mentorshipRequestId = mentorReqRes.data?.data?.request?._id;
    }

    // Duplicate PENDING request → 409
    const dupMentorRes = await api('/mentorship/requests', {
      method: 'POST',
      token: tokens.student,
      body: {
        alumniId: alumniUserId,
        topic: 'Same topic',
        message: 'Duplicate pending request attempt.',
      },
    });
    assert('POST /mentorship/requests (duplicate pending → 409)', dupMentorRes, 409);
  }

  // Student views own requests
  const studentMentorListRes = await api('/mentorship/student', { token: tokens.student });
  assert('GET /mentorship/student', studentMentorListRes, 200);

  // Alumni views incoming requests
  const alumniMentorListRes = await api('/mentorship/alumni', { token: tokens.alumni });
  assert('GET /mentorship/alumni', alumniMentorListRes, 200);

  // Get request by ID — participant can view
  if (mentorshipRequestId) {
    const getReqRes = await api(`/mentorship/requests/${mentorshipRequestId}`, {
      token: tokens.student,
    });
    assert('GET /mentorship/requests/:id (student participant)', getReqRes, 200);

    // Third party cannot view
    const thirdPartyRes = await api(`/mentorship/requests/${mentorshipRequestId}`, {
      token: tokens.student2,
    });
    assert('GET /mentorship/requests/:id (non-participant → 403)', thirdPartyRes, 403);
  }

  // Create a second request specifically for cancel testing
  let cancelMentorId = null;
  if (alumniUserId) {
    // First, complete the first one so we can create a new PENDING one
    // Accept and complete the first request
    if (mentorshipRequestId) {
      const acceptRes = await api(`/mentorship/requests/${mentorshipRequestId}/accept`, {
        method: 'PATCH',
        token: tokens.alumni,
        body: { responseMessage: 'Happy to help!' },
      });
      assert('PATCH /mentorship/requests/:id/accept', acceptRes, 200);

      // Cannot accept again
      const dupAcceptRes = await api(`/mentorship/requests/${mentorshipRequestId}/accept`, {
        method: 'PATCH',
        token: tokens.alumni,
        body: {},
      });
      assert('PATCH accept (already accepted → 400)', dupAcceptRes, 400);

      const completeRes = await api(`/mentorship/requests/${mentorshipRequestId}/complete`, {
        method: 'PATCH',
        token: tokens.alumni,
      });
      assert('PATCH /mentorship/requests/:id/complete', completeRes, 200);
    }

    // Create a new PENDING request for cancel test
    const cancelReqRes = await api('/mentorship/requests', {
      method: 'POST',
      token: tokens.student,
      body: {
        alumniId: alumniUserId,
        topic: 'Request to be cancelled',
        message: 'This request will be cancelled by the student.',
      },
    });
    if (assert('POST /mentorship/requests (for cancel test)', cancelReqRes, 201)) {
      cancelMentorId = cancelReqRes.data?.data?.request?._id;
    }

    if (cancelMentorId) {
      // Decline a fresh request
      const declineRes = await api(`/mentorship/requests/${cancelMentorId}/decline`, {
        method: 'PATCH',
        token: tokens.alumni,
        body: { responseMessage: 'Sorry, not available.' },
      });
      assert('PATCH /mentorship/requests/:id/decline', declineRes, 200);
    }

    // Create yet another for student cancel
    const cancelStudentReqRes = await api('/mentorship/requests', {
      method: 'POST',
      token: tokens.student,
      body: {
        alumniId: alumniUserId,
        topic: 'Student will cancel this',
        message: 'Testing student cancellation flow.',
      },
    });
    if (assert('POST /mentorship/requests (for student cancel test)', cancelStudentReqRes, 201)) {
      const studentCancelId = cancelStudentReqRes.data?.data?.request?._id;
      if (studentCancelId) {
        const studentCancelRes = await api(`/mentorship/requests/${studentCancelId}/cancel`, {
          method: 'PATCH',
          token: tokens.student,
        });
        assert('PATCH /mentorship/requests/:id/cancel (student)', studentCancelRes, 200);
      }
    }
  }

  // ── 5. Skill Endorsements ────────────────────────────────────────────────

  logHeader('5. Skill Endorsements');

  // Student needs a profile with skills first — create or update
  await api('/profile', {
    method: 'POST',
    token: tokens.student,
    body: {
      fullName: USERS.student.fullName,
      college: 'Test University',
      branch: 'Computer Science',
      skills: ['Node.js', 'MongoDB', 'React'],
    },
  });

  // Verified alumni endorses a skill on student's profile
  const endorseRes = await api('/alumni/endorsements', {
    method: 'POST',
    token: tokens.alumni,
    body: {
      studentId: studentUserId,
      skill: 'Node.js',
      message: 'Excellent Node.js developer!',
    },
  });
  if (assert('POST /alumni/endorsements (verified alumni)', endorseRes, 201)) {
    endorsementId = endorseRes.data?.data?.endorsement?._id;
  }

  // Duplicate endorsement → 409
  const dupEndorseRes = await api('/alumni/endorsements', {
    method: 'POST',
    token: tokens.alumni,
    body: {
      studentId: studentUserId,
      skill: 'Node.js',
      message: 'Duplicate!',
    },
  });
  assert('POST /alumni/endorsements (duplicate → 409)', dupEndorseRes, 409);

  // Skill not on student's profile → 400
  const wrongSkillRes = await api('/alumni/endorsements', {
    method: 'POST',
    token: tokens.alumni,
    body: {
      studentId: studentUserId,
      skill: 'COBOL',
      message: 'Testing invalid skill.',
    },
  });
  assert('POST /alumni/endorsements (skill not on profile → 400)', wrongSkillRes, 400);

  // Student cannot create endorsements
  const studentEndorseRes = await api('/alumni/endorsements', {
    method: 'POST',
    token: tokens.student,
    body: { studentId: studentUserId, skill: 'React' },
  });
  assert('POST /alumni/endorsements (student → 403)', studentEndorseRes, 403);

  // List student endorsements
  if (studentUserId) {
    const listEndorseRes = await api(`/alumni/students/${studentUserId}/endorsements`, {
      token: tokens.alumni,
    });
    assert(`GET /alumni/students/:studentId/endorsements`, listEndorseRes, 200);
  }

  // Delete endorsement
  if (endorsementId) {
    const deleteEndorseRes = await api(`/alumni/endorsements/${endorsementId}`, {
      method: 'DELETE',
      token: tokens.alumni,
    });
    assert('DELETE /alumni/endorsements/:id', deleteEndorseRes, 200);

    // Cannot delete again
    const delAgainRes = await api(`/alumni/endorsements/${endorsementId}`, {
      method: 'DELETE',
      token: tokens.alumni,
    });
    assert('DELETE /alumni/endorsements/:id (already deleted → 404)', delAgainRes, 404);
  }

  // ── 6. Referrals ─────────────────────────────────────────────────────────

  logHeader('6. Referrals');

  if (studentUserId) {
    const createReferralRes = await api('/referrals', {
      method: 'POST',
      token: tokens.alumni,
      body: {
        studentId: studentUserId,
        companyName: 'Google',
        jobTitle: 'Software Engineer',
        jobUrl: 'https://careers.google.com/jobs/test',
        message: 'I strongly recommend this candidate.',
        status: 'DRAFT',
      },
    });
    if (assert('POST /referrals (verified alumni)', createReferralRes, 201)) {
      referralId = createReferralRes.data?.data?.referral?._id;
    }
  }

  // Unverified alumni2 cannot create referral
  const unverifAlumniRef = await api('/referrals', {
    method: 'POST',
    token: tokens.alumni2,
    body: {
      studentId: studentUserId,
      companyName: 'Meta',
      jobTitle: 'Engineer',
    },
  });
  assert('POST /referrals (unverified alumni → 403)', unverifAlumniRef, 403);

  // Alumni views own referrals
  const alumniRefListRes = await api('/referrals/alumni', { token: tokens.alumni });
  assert('GET /referrals/alumni', alumniRefListRes, 200);

  // Student views own referrals
  const studentRefListRes = await api('/referrals/student', { token: tokens.student });
  assert('GET /referrals/student', studentRefListRes, 200);

  // Get referral by ID — alumni can view
  if (referralId) {
    const getReferralRes = await api(`/referrals/${referralId}`, { token: tokens.alumni });
    assert('GET /referrals/:id (alumni)', getReferralRes, 200);

    // Student can view
    const studentReferralRes = await api(`/referrals/${referralId}`, { token: tokens.student });
    assert('GET /referrals/:id (student)', studentReferralRes, 200);

    // Second student cannot view
    const unauthorizedRes = await api(`/referrals/${referralId}`, { token: tokens.student2 });
    assert('GET /referrals/:id (unauthorized student → 403)', unauthorizedRes, 403);

    // Update referral
    const updateReferralRes = await api(`/referrals/${referralId}`, {
      method: 'PATCH',
      token: tokens.alumni,
      body: { status: 'SUBMITTED', message: 'Updated message.' },
    });
    assert('PATCH /referrals/:id (alumni)', updateReferralRes, 200);

    // Delete — now SUBMITTED, not DRAFT → 400
    const deleteNotDraftRes = await api(`/referrals/${referralId}`, {
      method: 'DELETE',
      token: tokens.alumni,
    });
    assert('DELETE /referrals/:id (not DRAFT → 400)', deleteNotDraftRes, 400);

    // Create a DRAFT referral to test deletion
    if (studentUserId2) {
      const draftReferralRes = await api('/referrals', {
        method: 'POST',
        token: tokens.alumni,
        body: {
          studentId: studentUserId2,
          companyName: 'Startup Inc',
          jobTitle: 'Backend Developer',
          status: 'DRAFT',
        },
      });
      if (assert('POST /referrals (DRAFT for delete test)', draftReferralRes, 201)) {
        const draftId = draftReferralRes.data?.data?.referral?._id;
        if (draftId) {
          const deleteDraftRes = await api(`/referrals/${draftId}`, {
            method: 'DELETE',
            token: tokens.alumni,
          });
          assert('DELETE /referrals/:id (DRAFT → 200)', deleteDraftRes, 200);
        }
      }
    }
  }

  // ── 7. Mock Interviews ────────────────────────────────────────────────────

  logHeader('7. Mock Interview Requests');

  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const futureDate2 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  if (alumniUserId) {
    // Student creates a mock interview request
    const createMockRes = await api('/mock-interviews', {
      method: 'POST',
      token: tokens.student,
      body: {
        alumniId: alumniUserId,
        topic: 'System Design Interview Prep',
        scheduledAt: futureDate,
        durationMinutes: 60,
        mode: 'ONLINE',
      },
    });
    if (assert('POST /mock-interviews (student)', createMockRes, 201)) {
      mockInterviewId = createMockRes.data?.data?.request?._id;
    }
  }

  // Student views own requests
  const studentMockList = await api('/mock-interviews/student', { token: tokens.student });
  assert('GET /mock-interviews/student', studentMockList, 200);

  // Alumni views incoming requests
  const alumniMockList = await api('/mock-interviews/alumni', { token: tokens.alumni });
  assert('GET /mock-interviews/alumni', alumniMockList, 200);

  if (mockInterviewId) {
    // Get by ID — student can view
    const getMockRes = await api(`/mock-interviews/${mockInterviewId}`, { token: tokens.student });
    assert('GET /mock-interviews/:id (student)', getMockRes, 200);

    // Non-participant cannot view
    const unauthorizedMock = await api(`/mock-interviews/${mockInterviewId}`, { token: tokens.student2 });
    assert('GET /mock-interviews/:id (non-participant → 403)', unauthorizedMock, 403);

    // Alumni accepts — ONLINE requires meetingUrl
    const acceptMockRes = await api(`/mock-interviews/${mockInterviewId}/accept`, {
      method: 'PATCH',
      token: tokens.alumni,
      body: { meetingUrl: 'https://meet.google.com/test-room-abc' },
    });
    assert('PATCH /mock-interviews/:id/accept (ONLINE with meetingUrl)', acceptMockRes, 200);

    // Cannot accept again
    const dupAcceptMock = await api(`/mock-interviews/${mockInterviewId}/accept`, {
      method: 'PATCH',
      token: tokens.alumni,
      body: { meetingUrl: 'https://meet.google.com/other-room' },
    });
    assert('PATCH /mock-interviews/:id/accept (already accepted → 400)', dupAcceptMock, 400);

    // Reschedule
    const rescheduleMockRes = await api(`/mock-interviews/${mockInterviewId}/reschedule`, {
      method: 'PATCH',
      token: tokens.alumni,
      body: {
        scheduledAt: futureDate2,
        meetingUrl: 'https://meet.google.com/rescheduled-room',
      },
    });
    assert('PATCH /mock-interviews/:id/reschedule', rescheduleMockRes, 200);

    // Complete — requires feedback
    const completeMockRes = await api(`/mock-interviews/${mockInterviewId}/complete`, {
      method: 'PATCH',
      token: tokens.alumni,
      body: {
        feedback: 'The student demonstrated strong understanding of distributed systems. Highly recommend.',
      },
    });
    assert('PATCH /mock-interviews/:id/complete', completeMockRes, 200);
  }

  // Test student cancel on a fresh request
  if (alumniUserId) {
    const cancelMockReqRes = await api('/mock-interviews', {
      method: 'POST',
      token: tokens.student,
      body: {
        alumniId: alumniUserId,
        topic: 'JavaScript Fundamentals',
        scheduledAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 45,
        mode: 'OFFLINE',
        location: 'Pune Library, 2nd Floor',
      },
    });
    if (assert('POST /mock-interviews (OFFLINE mode)', cancelMockReqRes, 201)) {
      const cancelMockId = cancelMockReqRes.data?.data?.request?._id;
      if (cancelMockId) {
        const cancelRes = await api(`/mock-interviews/${cancelMockId}/cancel`, {
          method: 'PATCH',
          token: tokens.student,
        });
        assert('PATCH /mock-interviews/:id/cancel (student cancels REQUESTED)', cancelRes, 200);
      }
    }
  }

  // ── 8. Validation & Security Tests ───────────────────────────────────────

  logHeader('8. Validation & Security Tests');

  // Invalid MongoDB ID
  const invalidIdRes = await api('/mentorship/requests/not-a-valid-id', {
    token: tokens.student,
  });
  assert('GET /mentorship/requests/:id (invalid ObjectId → 400)', invalidIdRes, 400);

  // Missing required fields
  const missingFieldsRes = await api('/mentorship/requests', {
    method: 'POST',
    token: tokens.student,
    body: { alumniId: alumniUserId }, // missing topic and message
  });
  assert('POST /mentorship/requests (missing fields → 400)', missingFieldsRes, 400);

  // Unauthenticated request
  const unauthRes = await api('/alumni/profile');
  assert('GET /alumni/profile (no token → 401)', unauthRes, 401);

  // Wrong role: student tries alumni endpoint
  const wrongRoleRes = await api('/alumni/profile', { token: tokens.student });
  assert('GET /alumni/profile (student role → 403)', wrongRoleRes, 403);

    // ── Summary ───────────────────────────────────────────────────────────────

    logHeader('TEST RESULTS SUMMARY');
    console.log(`${C.bright}Passed: ${C.green}${passed}${C.reset}`);
    console.log(`${C.bright}Failed: ${C.red}${failed}${C.reset}`);

    if (failed > 0) {
      console.log(`\n${C.red}${C.bright}${failed} test(s) failed.${C.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${C.green}${C.bright}All ${passed} alumni backend tests passed!${C.reset}\n`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error(`${C.red}Fatal error:${C.reset}`, err);
  process.exit(1);
});
