import mongoose from 'mongoose';
import env from '../config/env.js';
import User from '../models/user.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import Certificate from '../models/certificate.model.js';
import Resume from '../models/resume.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import RecruiterProfile from '../models/recruiterProfile.model.js';
import Shortlist from '../models/shortlist.model.js';
import { generateTokenPair } from '../utils/jwt.util.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✖ FAIL: ${message}`);
    failed++;
  }
}

const BASE_URL = `http://localhost:${env.PORT || 5000}${env.API_PREFIX || '/api/v1'}`;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('\n=== VidyaLink – Recruiter Backend Integration Test Suite ===\n');
  console.log(`Target API URL: ${BASE_URL}\n`);

  await mongoose.connect(env.MONGODB_URI);

  const timestamp = Date.now();

  // ── Setup Actors ──────────────────────────────────────────────
  const recruiterUser = await User.create({
    fullName: `Tech Recruiter ${timestamp}`,
    email: `recruiter_${timestamp}@hiretech.test`,
    password: 'Password123!',
    role: 'recruiter',
    college: 'Talent Acquisition Org',
  });

  const studentUser = await User.create({
    fullName: `Top Candidate ${timestamp}`,
    email: `candidate_${timestamp}@vidyalink.test`,
    password: 'Password123!',
    role: 'student',
    college: 'Apex Institute of Technology',
    branch: 'Computer Science and Engineering',
  });

  const studentUser2 = await User.create({
    fullName: `Second Candidate ${timestamp}`,
    email: `candidate2_${timestamp}@vidyalink.test`,
    password: 'Password123!',
    role: 'student',
    college: 'Apex Institute of Technology',
    branch: 'Information Technology',
  });

  // Setup Student 1 Profile and Assets
  const student1Profile = await Profile.create({
    user: studentUser._id,
    fullName: studentUser.fullName,
    college: studentUser.college,
    branch: studentUser.branch,
    graduationYear: 2026,
    currentYear: 4,
    cgpa: 9.2,
    headline: 'Aspiring Full Stack Engineer & Cloud Developer',
    bio: 'Passionate about building scalable distributed systems.',
    skills: ['React', 'Node.js', 'Python', 'FastAPI', 'MongoDB'],
    interests: ['Distributed Systems', 'Cloud Architecture'],
  });

  const student1Project = await Project.create({
    userId: studentUser._id,
    title: 'Cloud Native Microservices Platform',
    shortDescription: 'Enterprise scalability platform with distributed tracing',
    detailedDescription: 'Full microservices architecture implemented with Node.js and FastAPI.',
    category: 'Web Development',
    technologies: ['Node.js', 'React', 'MongoDB', 'Docker'],
    githubRepository: 'https://github.com/candidate/cloud-platform',
    liveDeployment: 'https://cloud-platform.demo',
    verificationStatus: 'Verified',
  });

  const student1Certificate = await Certificate.create({
    userId: studentUser._id,
    title: 'AWS Certified Solutions Architect',
    issuer: 'Amazon Web Services',
    category: 'Cloud Certification',
    issueDate: new Date('2026-01-10'),
    certificateFile: {
      originalFileName: 'aws_cert.pdf',
      storedFileName: 'aws_cert_stored.pdf',
      fileUrl: 'https://example.com/aws_cert.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
    },
    skills: ['AWS', 'Cloud Architecture'],
    verificationStatus: 'Verified',
  });

  const student1Resume = await Resume.create({
    userId: studentUser._id,
    originalFileName: 'top_candidate_resume.pdf',
    storedFileName: 'resume_123.pdf',
    fileUrl: '/uploads/resumes/resume_123.pdf',
    fileSize: 51200,
    mimeType: 'application/pdf',
  });

  const student1Github = await GitHubAccount.create({
    userId: studentUser._id,
    githubUsername: 'topcandidate',
    githubProfileUrl: 'https://github.com/topcandidate',
    bio: 'Open source contributor and full-stack builder',
    publicRepos: 24,
    followers: 120,
    following: 45,
    connectionStatus: 'Connected',
  });

  // Setup Student 2 Profile
  const student2Profile = await Profile.create({
    user: studentUser2._id,
    fullName: studentUser2.fullName,
    college: studentUser2.college,
    branch: studentUser2.branch,
    graduationYear: 2027,
    currentYear: 3,
    cgpa: 8.8,
    headline: 'Mobile App Developer',
    skills: ['Flutter', 'Dart', 'Firebase'],
  });

  const { accessToken: recruiterToken } = generateTokenPair(recruiterUser);
  const { accessToken: studentToken } = generateTokenPair(studentUser);

  try {
    // ── 1. Recruiter Profile Management ─────────────────────────
    console.log('--- 1. Recruiter Profile Management ---');
    
    // Create Recruiter Profile
    const createProfRes = await request('/recruiter/profile', {
      method: 'POST',
      headers: { Authorization: `Bearer ${recruiterToken}` },
      body: {
        companyName: 'Apex Talent Innovations',
        companyWebsite: 'https://apextalent.example.com',
        companyDescription: 'Premier tech hiring and campus placement network.',
        industry: 'Information Technology',
        designation: 'Head of Campus Recruitment',
        location: 'Bengaluru, India',
      },
    });

    assert(createProfRes.status === 201, 'POST /recruiter/profile returns HTTP 201 Created');
    assert(
      createProfRes.data?.data?.companyName === 'Apex Talent Innovations',
      'Created profile contains valid companyName'
    );
    assert(
      createProfRes.data?.data?.isVerified === false,
      'New recruiter profile is default unverified'
    );

    // Duplicate Recruiter Profile Rejection
    const dupProfRes = await request('/recruiter/profile', {
      method: 'POST',
      headers: { Authorization: `Bearer ${recruiterToken}` },
      body: {
        companyName: 'Apex Talent Innovations',
      },
    });
    assert(dupProfRes.status === 409, 'Duplicate recruiter profile creation returns HTTP 409 Conflict');

    // Get Recruiter Profile
    const getProfRes = await request('/recruiter/profile', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(getProfRes.status === 200, 'GET /recruiter/profile returns HTTP 200 OK');
    assert(
      getProfRes.data?.data?.designation === 'Head of Campus Recruitment',
      'GET profile returns populated designation'
    );

    // Update Recruiter Profile
    const updateProfRes = await request('/recruiter/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${recruiterToken}` },
      body: {
        designation: 'Director of University Talent',
        location: 'Bengaluru / Hybrid',
      },
    });
    assert(updateProfRes.status === 200, 'PATCH /recruiter/profile returns HTTP 200 OK');
    assert(
      updateProfRes.data?.data?.designation === 'Director of University Talent',
      'PATCH updates designation successfully'
    );

    // ── 2. Candidate Search, Filters, and Sorting ───────────────
    console.log('\n--- 2. Candidate Discovery Search & Filtering ---');

    // Basic Candidate Search
    const searchRes = await request('/recruiter/candidates', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(searchRes.status === 200, 'GET /recruiter/candidates returns HTTP 200 OK');
    assert(Array.isArray(searchRes.data?.data?.candidates), 'Candidate list is returned as array');
    assert(searchRes.data?.data?.pagination?.total >= 2, 'Candidate total count is accurate');

    // Pagination Limit Test
    const pageRes = await request('/recruiter/candidates?page=1&limit=1', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(pageRes.status === 200, 'Paginated search returns HTTP 200');
    assert(pageRes.data?.data?.candidates?.length === 1, 'Pagination limit=1 strictly enforced');
    assert(pageRes.data?.data?.pagination?.limit === 1, 'Pagination metadata reflects limit=1');

    // Skills Filter Test
    const skillsRes = await request('/recruiter/candidates?skills=React,Node.js', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(skillsRes.status === 200, 'Skills filter returns HTTP 200');
    const matchedSkillsCandidates = skillsRes.data?.data?.candidates || [];
    assert(
      matchedSkillsCandidates.some((c) => c.studentId === String(studentUser._id)),
      'Skills filter correctly matches candidate with React / Node.js'
    );
    assert(
      !matchedSkillsCandidates.some((c) => c.studentId === String(studentUser2._id)),
      'Skills filter excludes candidate lacking requested skills'
    );

    // Branch Filter Test
    const branchRes = await request('/recruiter/candidates?branch=Computer', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(branchRes.status === 200, 'Branch filter returns HTTP 200');
    const branchCandidates = branchRes.data?.data?.candidates || [];
    assert(
      branchCandidates.every((c) => /Computer/i.test(c.branch)),
      'Branch filter only returns matching branch candidates'
    );

    // Graduation Year Filter Test
    const gradRes = await request('/recruiter/candidates?graduationYear=2026', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(gradRes.status === 200, 'Graduation year filter returns HTTP 200');
    const gradCandidates = gradRes.data?.data?.candidates || [];
    assert(
      gradCandidates.every((c) => c.graduationYear === 2026),
      'Graduation year filter strictly matches requested year 2026'
    );

    // Sorting Test (Name Ascending)
    const sortRes = await request('/recruiter/candidates?sortBy=name&sortOrder=asc', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(sortRes.status === 200, 'Sorting query returns HTTP 200');

    // Invalid Filter Handling
    const invalidFilterRes = await request('/recruiter/candidates?page=0&limit=500', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(
      invalidFilterRes.status === 400,
      'Invalid page/limit parameters reject with HTTP 400 Validation Error'
    );

    // ── 3. Candidate Details Endpoint ───────────────────────────
    console.log('\n--- 3. Candidate Full Details Inspection ---');

    const detailRes = await request(`/recruiter/candidates/${studentUser._id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(detailRes.status === 200, 'GET /recruiter/candidates/:studentId returns HTTP 200 OK');
    const candidateData = detailRes.data?.data;
    assert(candidateData?.studentId === String(studentUser._id), 'Candidate studentId matches');
    assert(candidateData?.name === studentUser.fullName, 'Candidate full name is populated');
    assert(candidateData?.projects?.length === 1, 'Candidate verified projects are included');
    assert(candidateData?.projects[0]?.verificationStatus === 'Verified', 'Project verificationStatus is Verified');
    assert(candidateData?.certificates?.length === 1, 'Candidate verified certificates are included');
    assert(candidateData?.resume?.isAvailable === true, 'Resume availability flag is true');
    assert(candidateData?.github?.isConnected === true, 'GitHub connection flag is true');
    assert(candidateData?.verificationSummary?.projects?.verified === 1, 'Verification summary counts verified projects');

    // Invalid Student ID format
    const badIdRes = await request('/recruiter/candidates/not-a-valid-id', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(badIdRes.status === 400, 'Invalid studentId format returns HTTP 400 Validation Error');

    // Non-existent Candidate
    const nonExistentRes = await request('/recruiter/candidates/507f1f77bcf86cd799439099', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(nonExistentRes.status === 404, 'Non-existent candidate returns HTTP 404 Not Found');

    // ── 4. Candidate Shortlisting Workflow ──────────────────────
    console.log('\n--- 4. Candidate Shortlisting Workflow ---');

    // Shortlist Candidate
    const shortlistRes = await request('/recruiter/shortlists', {
      method: 'POST',
      headers: { Authorization: `Bearer ${recruiterToken}` },
      body: {
        studentId: String(studentUser._id),
        notes: 'Top candidate for upcoming Cloud Platform Engineer position.',
      },
    });
    assert(shortlistRes.status === 201, 'POST /recruiter/shortlists returns HTTP 201 Created');
    assert(
      shortlistRes.data?.data?.status === 'SHORTLISTED',
      'Shortlist entry status is SHORTLISTED'
    );

    // Duplicate Active Shortlist Rejection
    const dupShortlistRes = await request('/recruiter/shortlists', {
      method: 'POST',
      headers: { Authorization: `Bearer ${recruiterToken}` },
      body: {
        studentId: String(studentUser._id),
      },
    });
    assert(
      dupShortlistRes.status === 409,
      'Duplicate active shortlist request returns HTTP 409 Conflict'
    );

    // Get Shortlists
    const getShortlistRes = await request('/recruiter/shortlists', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(getShortlistRes.status === 200, 'GET /recruiter/shortlists returns HTTP 200 OK');
    assert(
      getShortlistRes.data?.data?.shortlists?.length >= 1,
      'Shortlist items are returned'
    );
    assert(
      getShortlistRes.data?.data?.shortlists[0]?.candidateName === studentUser.fullName,
      'Shortlist item includes candidate name'
    );

    // Remove from Shortlist
    const removeShortlistRes = await request(`/recruiter/shortlists/${studentUser._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(removeShortlistRes.status === 200, 'DELETE /recruiter/shortlists/:studentId returns HTTP 200 OK');
    assert(
      removeShortlistRes.data?.data?.status === 'REMOVED',
      'Shortlist status transition is REMOVED'
    );

    // Verify Shortlist List after removal
    const verifyRemovedRes = await request('/recruiter/shortlists?status=SHORTLISTED', {
      method: 'GET',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(
      !verifyRemovedRes.data?.data?.shortlists?.some((s) => s.studentId === String(studentUser._id)),
      'Removed candidate no longer appears in active SHORTLISTED query'
    );

    // ── 5. Security, RBAC & Private Field Leakage Audits ────────
    console.log('\n--- 5. Security, RBAC & Private Field Leakage Audits ---');

    // Student trying to access recruiter candidates
    const studentBlockedRes = await request('/recruiter/candidates', {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentBlockedRes.status === 403,
      'Student role accessing /recruiter/candidates returns HTTP 403 Forbidden'
    );

    // Unauthenticated request
    const unauthRes = await request('/recruiter/candidates', {
      method: 'GET',
    });
    assert(
      unauthRes.status === 401,
      'Unauthenticated request returns HTTP 401 Unauthorized'
    );

    // Private Field Leakage Assertions
    const candidateJson = JSON.stringify(searchRes.data);
    assert(!candidateJson.includes('password'), 'Candidate search response never contains "password" field');
    assert(!candidateJson.includes('refreshToken'), 'Candidate search response never contains "refreshToken" field');
    assert(!candidateJson.includes('bcrypt'), 'Candidate search response never contains hashed password artifacts');

    const detailJson = JSON.stringify(detailRes.data);
    assert(!detailJson.includes('password'), 'Candidate detail response never contains "password" field');
    assert(!detailJson.includes('refreshToken'), 'Candidate detail response never contains "refreshToken" field');

  } finally {
    // ── Cleanup Test Data ───────────────────────────────────────
    await Promise.all([
      User.deleteMany({ _id: { $in: [recruiterUser._id, studentUser._id, studentUser2._id] } }),
      Profile.deleteMany({ user: { $in: [studentUser._id, studentUser2._id] } }),
      Project.deleteMany({ userId: studentUser._id }),
      Certificate.deleteMany({ userId: studentUser._id }),
      Resume.deleteMany({ userId: studentUser._id }),
      GitHubAccount.deleteMany({ userId: studentUser._id }),
      RecruiterProfile.deleteMany({ userId: recruiterUser._id }),
      Shortlist.deleteMany({ recruiterId: recruiterUser._id }),
    ]);

    await mongoose.disconnect();
  }

  console.log('\n=== RECRUITER BACKEND TEST RESULTS SUMMARY ===');
  console.log(`Total Checks Passed : ${passed}`);
  console.log(`Total Checks Failed : ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\nALL RECRUITER BACKEND INTEGRATION TESTS PASSED PERFECTLY!\n');
  }
}

runTests().catch((err) => {
  console.error('Fatal error during recruiter test runner:', err);
  process.exit(1);
});
