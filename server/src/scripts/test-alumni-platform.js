import process from 'node:process';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import User from '../models/user.model.js';
import AlumniProfile from '../models/alumniProfile.model.js';
import Mentorship from '../models/mentorship.model.js';
import Endorsement from '../models/endorsement.model.js';
import MockInterview from '../models/mockInterview.model.js';
import Referral from '../models/referral.model.js';
import Notification from '../models/notification.model.js';
import Profile from '../models/profile.model.js';
import Portfolio from '../models/portfolio.model.js';
import { env } from '../config/env.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function logPass(msg) {
  console.log(`${colors.green}✔ PASS:${colors.reset} ${msg}`);
}

function logFail(msg, detail = '') {
  console.error(`${colors.red}✖ FAIL:${colors.reset} ${msg}`);
  if (detail) console.error(`  ${colors.red}Details:${colors.reset}`, detail);
}

function logHeader(msg) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}`);
}

async function runTests() {
  logHeader('VIDYALINK — Alumni Platform End-to-End Test Suite');

  const mongoUri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vidyalink';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  await AlumniProfile.syncIndexes().catch(() => {});

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  let passed = 0;
  let failed = 0;

  const assert = (name, condition, detail = '') => {
    if (condition) {
      logPass(name);
      passed++;
      return true;
    } else {
      logFail(name, typeof detail === 'object' ? JSON.stringify(detail) : detail);
      failed++;
      return false;
    }
  };

  const req = async (path, options = {}) => {
    const url = `${baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    return { status: res.status, data };
  };

  try {
    // 1. Setup Test Users
    logHeader('1. Test Users Setup & Authentication');
    const timestamp = Date.now();
    const alumniEmail = `alumni_test_${timestamp}@vidyalink.edu`;
    const studentEmail = `student_test_${timestamp}@vidyalink.edu`;
    const password = 'Password123!';

    const alumniUser = await User.create({
      fullName: 'Elena Rostova (Alumni)',
      email: alumniEmail,
      password,
      role: 'alumni',
      college: 'MIT University',
      branch: 'Computer Science',
      graduationYear: 2021,
      isEmailVerified: true,
      status: 'active',
    });

    const studentUser = await User.create({
      fullName: 'Dev Sharma (Student)',
      email: studentEmail,
      password,
      role: 'student',
      college: 'MIT University',
      branch: 'Computer Science',
      graduationYear: 2026,
      isEmailVerified: true,
      status: 'active',
    });

    // Student profile with skills
    await Profile.create({
      user: studentUser._id,
      fullName: studentUser.fullName,
      college: studentUser.college,
      branch: studentUser.branch,
      graduationYear: 2026,
      skills: ['React', 'Node.js', 'System Design', 'Python'],
      bio: 'Enthusiastic full-stack engineer passionate about cloud architectures.',
    });

    await Portfolio.create({
      certificateId: `VLC-2026-${Date.now().toString(16).toUpperCase()}`,
      student: studentUser._id,
      workspace: new mongoose.Types.ObjectId(),
      projectTitle: 'Distributed Task Queue System',
      verifiedBy: alumniUser._id,
      skillsVerified: ['Node.js', 'System Design'],
      verificationHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });

    // Logins
    const alumniLoginRes = await req('/auth/login', {
      method: 'POST',
      body: { email: alumniEmail, password },
    });
    const alumniToken = alumniLoginRes.data?.data?.accessToken;
    assert('Alumni login successfully generated JWT', !!alumniToken && alumniLoginRes.status === 200, alumniLoginRes.data);

    const studentLoginRes = await req('/auth/login', {
      method: 'POST',
      body: { email: studentEmail, password },
    });
    const studentToken = studentLoginRes.data?.data?.accessToken;
    assert('Student login successfully generated JWT', !!studentToken && studentLoginRes.status === 200, studentLoginRes.data);

    // 2. Alumni Profile CRUD
    logHeader('2. Alumni Profile Management (PART 1)');
    const getProfileRes = await req('/alumni/profile', { token: alumniToken });
    assert('GET /api/v1/alumni/profile returns default profile', getProfileRes.status === 200 && getProfileRes.data?.data?.profile, getProfileRes.data);

    const patchProfileRes = await req('/alumni/profile', {
      method: 'PATCH',
      token: alumniToken,
      body: {
        company: 'Google Cloud',
        designation: 'Senior Staff Engineer',
        industry: 'Cloud Infrastructure',
        experience: 5,
        skills: ['Distributed Systems', 'Kubernetes', 'Go', 'System Architecture'],
        bio: 'Helping engineers scale systems and career paths.',
        location: 'Bengaluru, India',
        linkedin: 'https://linkedin.com/in/elena-rostova',
      },
    });
    assert('PATCH /api/v1/alumni/profile updates details', patchProfileRes.status === 200 && patchProfileRes.data?.data?.profile?.company === 'Google Cloud', patchProfileRes.data);

    // 3. Verified Student Discovery
    logHeader('3. Verified Student Discovery (PART 2)');
    const searchRes = await req('/alumni/students?skills=React&branch=Computer', { token: alumniToken });
    assert('GET /api/v1/alumni/students returns student list', searchRes.status === 200 && Array.isArray(searchRes.data?.data?.students), searchRes.data);
    const foundStudent = searchRes.data?.data?.students?.find((s) => s.email === studentEmail);
    assert('Found verified student in search query', !!foundStudent && foundStudent.isPortfolioVerified === true, searchRes.data);

    // Verify private data is NOT leaked
    assert('Private fields omitted (no password/tokens)', !foundStudent?.password && !foundStudent?.refreshToken);

    // 4. Student Portfolio View
    logHeader('4. Student Portfolio View (PART 3)');
    const portViewRes = await req(`/alumni/students/${studentUser._id}`, { token: alumniToken });
    assert('GET /api/v1/alumni/students/:studentId returns detailed portfolio', portViewRes.status === 200 && portViewRes.data?.data?.student?.fullName === studentUser.fullName, portViewRes.data);
    assert('Portfolio view includes AI Industry Readiness Scorecard', typeof portViewRes.data?.data?.industryReadiness?.score === 'number', portViewRes.data);
    assert('Portfolio view includes Verified Portfolios list', portViewRes.data?.data?.portfolios?.length > 0, portViewRes.data);

    // 5. Mentorship Lifecycle
    logHeader('5. Mentorship Lifecycle (PART 4)');
    // Student requests mentorship
    const mentorReqRes = await req('/alumni/mentorship/requests', {
      method: 'POST',
      token: studentToken,
      body: {
        alumniId: String(alumniUser._id),
        topic: 'System Architecture & Microservices',
        message: 'Looking for advice on preparing for backend staff engineer roles.',
        goals: ['Master consensus algorithms', 'Resume critique'],
      },
    });
    assert('Student requests mentorship (POST /api/v1/alumni/mentorship/requests)', mentorReqRes.status === 201, mentorReqRes.data);
    const mentorshipId = mentorReqRes.data?.data?.request?._id;

    // Alumni lists requests
    const mentorListRes = await req('/alumni/mentorship/requests', { token: alumniToken });
    assert('Alumni retrieves pending mentorship requests', mentorListRes.status === 200 && mentorListRes.data?.data?.requests?.some((r) => r._id === mentorshipId), mentorListRes.data);

    // Alumni accepts mentorship
    const acceptRes = await req(`/alumni/mentorship/requests/${mentorshipId}/accept`, {
      method: 'PATCH',
      token: alumniToken,
      body: { notes: 'Happy to connect! Let us schedule our first session.' },
    });
    assert('Alumni accepts mentorship request (PATCH .../accept)', acceptRes.status === 200 && acceptRes.data?.data?.request?.status === 'ACCEPTED', acceptRes.data);

    // Alumni completes mentorship with scorecard
    const completeMentorRes = await req(`/alumni/mentorship/requests/${mentorshipId}/complete`, {
      method: 'PATCH',
      token: alumniToken,
      body: {
        notes: 'Great mentee with strong drive.',
        feedback: { rating: 5, comment: 'Exceptional progress on distributed cache design.' },
      },
    });
    assert('Alumni completes mentorship with rating (PATCH .../complete)', completeMentorRes.status === 200 && completeMentorRes.data?.data?.request?.status === 'COMPLETED', completeMentorRes.data);

    // 6. Skill Endorsements
    logHeader('6. Skill Endorsements (PART 5)');
    // Alumni endorses skill
    const endorseRes = await req('/alumni/endorsements', {
      method: 'POST',
      token: alumniToken,
      body: {
        studentId: String(studentUser._id),
        skill: 'System Design',
        message: 'Demonstrated solid grasp of CAP theorem and partitioning in project review.',
      },
    });
    assert('Alumni endorses skill (POST /api/v1/alumni/endorsements)', endorseRes.status === 201 && endorseRes.data?.data?.endorsement?.skill === 'System Design', endorseRes.data);
    const endorsementId = endorseRes.data?.data?.endorsement?._id;

    // Duplicate endorsement check
    const dupEndorseRes = await req('/alumni/endorsements', {
      method: 'POST',
      token: alumniToken,
      body: {
        studentId: String(studentUser._id),
        skill: 'System Design',
        message: 'Duplicate endorsement attempt.',
      },
    });
    assert('Duplicate active endorsement rejected with HTTP 409 Conflict', dupEndorseRes.status === 409, dupEndorseRes.data);

    // List endorsements
    const listEndorseRes = await req(`/alumni/endorsements?studentId=${studentUser._id}`, { token: alumniToken });
    assert('GET /api/v1/alumni/endorsements returns endorsements', listEndorseRes.status === 200 && listEndorseRes.data?.data?.endorsements?.length > 0, listEndorseRes.data);

    // 7. Mock Interviews
    logHeader('7. Mock Interviews (PART 6)');
    // Student requests mock interview
    const interviewReqRes = await req('/alumni/mock-interviews', {
      method: 'POST',
      token: studentToken,
      body: {
        alumniId: String(alumniUser._id),
        roleTarget: 'Backend Software Engineer',
        mode: 'ONLINE',
        notes: 'Practicing for upcoming product company rounds.',
      },
    });
    assert('Student requests mock interview (POST /api/v1/alumni/mock-interviews)', interviewReqRes.status === 201, interviewReqRes.data);
    const interviewId = interviewReqRes.data?.data?.interview?._id;

    // Alumni schedules mock interview with meeting link
    const scheduleRes = await req(`/alumni/mock-interviews/${interviewId}/schedule`, {
      method: 'PATCH',
      token: alumniToken,
      body: {
        mode: 'ONLINE',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        durationMinutes: 45,
      },
    });
    assert('Alumni schedules online interview with meeting link (PATCH .../schedule)', scheduleRes.status === 200 && scheduleRes.data?.data?.interview?.status === 'SCHEDULED', scheduleRes.data);

    // Alumni completes mock interview with rubric
    const completeInterviewRes = await req(`/alumni/mock-interviews/${interviewId}/complete`, {
      method: 'PATCH',
      token: alumniToken,
      body: {
        feedback: {
          rating: 5,
          technicalSkills: 'Excellent algorithmic thinking and clean code.',
          communication: 'Articulate and asked clarifying requirements upfront.',
          strengths: ['Algorithms', 'System Scaling'],
          improvements: ['Database indexing edge cases'],
          detailedSummary: 'Top tier candidate ready for junior/mid backend engineer positions.',
        },
      },
    });
    assert('Alumni completes mock interview with scorecard (PATCH .../complete)', completeInterviewRes.status === 200 && completeInterviewRes.data?.data?.interview?.status === 'COMPLETED', completeInterviewRes.data);

    // 8. Referrals
    logHeader('8. Candidate Referrals (PART 7)');
    const referralRes = await req('/alumni/referrals', {
      method: 'POST',
      token: alumniToken,
      body: {
        studentId: String(studentUser._id),
        company: 'Google',
        jobTitle: 'Software Engineer, Cloud Storage',
        jobUrl: 'https://careers.google.com/jobs/results/12345',
        message: 'Submitted resume to internal hiring portal.',
        status: 'SUBMITTED',
      },
    });
    assert('Alumni creates referral (POST /api/v1/alumni/referrals)', referralRes.status === 201 && referralRes.data?.data?.referral?.company === 'Google', referralRes.data);
    const referralId = referralRes.data?.data?.referral?._id;

    // Update referral status to REFERRED
    const patchReferralRes = await req(`/alumni/referrals/${referralId}`, {
      method: 'PATCH',
      token: alumniToken,
      body: {
        status: 'REFERRED',
        internalNotes: 'Referral confirmed by team lead.',
      },
    });
    assert('Alumni updates referral status (PATCH /api/v1/alumni/referrals/:id)', patchReferralRes.status === 200 && patchReferralRes.data?.data?.referral?.status === 'REFERRED', patchReferralRes.data);

    // 9. Dashboard Aggregates
    logHeader('9. Alumni Dashboard Aggregates (PART 8)');
    const dashboardRes = await req('/alumni/dashboard/stats', { token: alumniToken });
    assert('GET /api/v1/alumni/dashboard/stats returns real counts', dashboardRes.status === 200 && dashboardRes.data?.data?.stats?.studentsMentored >= 1, dashboardRes.data);
    assert('Dashboard includes active referrals count', dashboardRes.data?.data?.stats?.activeReferrals >= 1, dashboardRes.data);

    // 10. Notifications
    logHeader('10. Notifications System (PART 9)');
    const notifRes = await req('/notifications', { token: studentToken });
    assert('Student receives real notifications for mentorship, endorsement & referral', notifRes.status === 200 && notifRes.data?.data?.notifications?.length >= 3, notifRes.data);
    const notifId = notifRes.data?.data?.notifications?.[0]?._id;

    // Mark notification as read
    const markReadRes = await req(`/notifications/${notifId}/read`, {
      method: 'PATCH',
      token: studentToken,
    });
    assert('PATCH /api/v1/notifications/:id/read marks notification as read', markReadRes.status === 200 && markReadRes.data?.data?.isRead === true, markReadRes.data);

    // 11. Security & RBAC
    logHeader('11. Security & RBAC Enforcement (PART 14)');
    const studentAsAlumniRes = await req('/alumni/dashboard/stats', { token: studentToken });
    assert('Student cannot access /api/v1/alumni/dashboard/stats (403 Forbidden)', studentAsAlumniRes.status === 403);

    const anonRes = await req('/alumni/students');
    assert('Anonymous request rejected (401 Unauthorized)', anonRes.status === 401);

    // Summary
    logHeader('TEST SUMMARY');
    console.log(`Total Passed: ${colors.green}${passed}${colors.reset}`);
    console.log(`Total Failed: ${failed > 0 ? colors.red : colors.green}${failed}${colors.reset}`);

    if (failed === 0) {
      console.log(`\n${colors.bright}${colors.green}ALL ALUMNI PLATFORM TESTS PASSED SUCCESSFULLY!${colors.reset}\n`);
    } else {
      console.error(`\n${colors.bright}${colors.red}SOME TESTS FAILED!${colors.reset}\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution exception:', err);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
