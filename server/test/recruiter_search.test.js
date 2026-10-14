import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import mongoose from 'mongoose';

process.env.JWT_SECRET ||= 'test-jwt-secret-test-jwt-secret-test';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-test-refresh-secret';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/vidyalink-test';

const User = (await import('../src/models/user.model.js')).default;
const Profile = (await import('../src/models/profile.model.js')).default;
const Project = (await import('../src/models/project.model.js')).default;
const Portfolio = (await import('../src/models/portfolio.model.js')).default;
const AIEvaluation = (await import('../src/models/aiEvaluation.model.js')).default;
const projectService = (await import('../src/services/project.service.js')).default;
const { getProjectsQuerySchema } = await import('../src/validators/project.validator.js');

const TEST_PREFIX = `test_rec_${Date.now()}`;
let userIdsToClean = [];
let projectIdsToClean = [];
let profileIdsToClean = [];
let evalIdsToClean = [];
let portfolioIdsToClean = [];

let studentA, studentB, studentC, studentD;
let projectAVerified, projectBVerified, projectCVerified, projectDUnverified, projectAMixedPending;

before(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  // Candidate A: Computer Engineering, 2026, AI Score 90, Verified Project + Pending Project
  studentA = await User.create({
    fullName: `${TEST_PREFIX} Alice CompEng`,
    email: `${TEST_PREFIX}_alice@test.edu`,
    password: 'Password123!',
    role: 'student',
    branch: 'Computer Engineering',
    graduationYear: 2026,
    college: 'Engineering Institute of Tech',
  });
  userIdsToClean.push(studentA._id);

  const profileA = await Profile.create({
    user: studentA._id,
    fullName: studentA.fullName,
    college: studentA.college,
    branch: 'Computer Engineering',
    graduationYear: 2026,
  });
  profileIdsToClean.push(profileA._id);

  projectAVerified = await Project.create({
    userId: studentA._id,
    title: `${TEST_PREFIX} Cloud Microservices Platform`,
    shortDescription: 'Scalable cloud distributed system using Kubernetes and Go.',
    detailedDescription: 'Detailed architectural overview of real-time cloud microservices deployment.',
    category: 'Cloud',
    domain: 'Cloud Infrastructure',
    technologies: ['Kubernetes', 'Go', 'Docker'],
    verificationStatus: 'Verified',
    projectStatus: 'Completed',
  });
  projectIdsToClean.push(projectAVerified._id);

  projectAMixedPending = await Project.create({
    userId: studentA._id,
    title: `${TEST_PREFIX} Unverified AI Chat Experiment`,
    shortDescription: 'Experimental prototype under development and not yet verified.',
    detailedDescription: 'Unverified exploratory machine learning notebook and script suite.',
    category: 'AI / ML',
    technologies: ['Python', 'PyTorch'],
    verificationStatus: 'Pending',
    projectStatus: 'In Progress',
  });
  projectIdsToClean.push(projectAMixedPending._id);

  const portfolioA = await Portfolio.create({
    certificateId: `VLC-${Date.now()}-A1`,
    student: studentA._id,
    project: projectAVerified._id,
    projectTitle: projectAVerified.title,
    verifiedBy: new mongoose.Types.ObjectId(),
    skillsVerified: ['Go', 'Cloud'],
    verificationHash: 'hash-a1',
  });
  portfolioIdsToClean.push(portfolioA._id);

  const evalA = await AIEvaluation.create({
    studentId: studentA._id,
    portfolioId: portfolioA._id,
    overallScore: 90,
    category: 'Excellent',
    componentScores: { codeQuality: 92, evidenceDepth: 88 },
    weightedBreakdown: { codeQuality: 92 },
    provider: 'deterministic',
    model: 'deterministic-heuristics',
    version: '1.0.0',
    evaluationStatus: 'COMPLETED',
  });
  evalIdsToClean.push(evalA._id);

  // Candidate B: Computer Engineering, 2027, AI Score 65, Verified Project
  studentB = await User.create({
    fullName: `${TEST_PREFIX} Bob CompEng`,
    email: `${TEST_PREFIX}_bob@test.edu`,
    password: 'Password123!',
    role: 'student',
    branch: 'Computer Engineering',
    graduationYear: 2027,
    college: 'Engineering Institute of Tech',
  });
  userIdsToClean.push(studentB._id);

  projectBVerified = await Project.create({
    userId: studentB._id,
    title: `${TEST_PREFIX} Mobile Health Tracker`,
    shortDescription: 'Cross-platform mobile application tracking vital metrics.',
    detailedDescription: 'React Native mobile app connected to Bluetooth health monitors.',
    category: 'Mobile App',
    domain: 'Healthcare',
    technologies: ['React Native', 'TypeScript', 'Firebase'],
    verificationStatus: 'Verified',
    projectStatus: 'Completed',
  });
  projectIdsToClean.push(projectBVerified._id);

  const portfolioB = await Portfolio.create({
    certificateId: `VLC-${Date.now()}-B1`,
    student: studentB._id,
    project: projectBVerified._id,
    projectTitle: projectBVerified.title,
    verifiedBy: new mongoose.Types.ObjectId(),
    skillsVerified: ['React Native', 'Mobile'],
    verificationHash: 'hash-b1',
  });
  portfolioIdsToClean.push(portfolioB._id);

  const evalB = await AIEvaluation.create({
    studentId: studentB._id,
    portfolioId: portfolioB._id,
    overallScore: 65,
    category: 'Good',
    componentScores: { codeQuality: 68, evidenceDepth: 62 },
    weightedBreakdown: { codeQuality: 68 },
    provider: 'deterministic',
    model: 'deterministic-heuristics',
    version: '1.0.0',
    evaluationStatus: 'COMPLETED',
  });
  evalIdsToClean.push(evalB._id);

  // Candidate C: Mechanical Engineering, 2027, AI Score 82, Verified Project
  studentC = await User.create({
    fullName: `${TEST_PREFIX} Charlie Mech`,
    email: `${TEST_PREFIX}_charlie@test.edu`,
    password: 'Password123!',
    role: 'student',
    branch: 'Mechanical Engineering',
    graduationYear: 2027,
    college: 'Institute of Mechanics',
  });
  userIdsToClean.push(studentC._id);

  projectCVerified = await Project.create({
    userId: studentC._id,
    title: `${TEST_PREFIX} Autonomous Robotic Arm Controller`,
    shortDescription: 'Robotic kinematics simulation with ROS2 and C++.',
    detailedDescription: 'Six-axis industrial robot trajectory planning and verification.',
    category: 'IoT',
    domain: 'Robotics',
    technologies: ['C++', 'ROS2', 'Python'],
    verificationStatus: 'Verified',
    projectStatus: 'Completed',
  });
  projectIdsToClean.push(projectCVerified._id);

  const portfolioC = await Portfolio.create({
    certificateId: `VLC-${Date.now()}-C1`,
    student: studentC._id,
    project: projectCVerified._id,
    projectTitle: projectCVerified.title,
    verifiedBy: new mongoose.Types.ObjectId(),
    skillsVerified: ['Robotics', 'ROS2'],
    verificationHash: 'hash-c1',
  });
  portfolioIdsToClean.push(portfolioC._id);

  const evalC = await AIEvaluation.create({
    studentId: studentC._id,
    portfolioId: portfolioC._id,
    overallScore: 82,
    category: 'Very Good',
    componentScores: { codeQuality: 84, evidenceDepth: 80 },
    weightedBreakdown: { codeQuality: 84 },
    provider: 'deterministic',
    model: 'deterministic-heuristics',
    version: '1.0.0',
    evaluationStatus: 'COMPLETED',
  });
  evalIdsToClean.push(evalC._id);

  // Candidate D: Computer Engineering, 2026, AI Score 95, ONLY UNVERIFIED PROJECT
  studentD = await User.create({
    fullName: `${TEST_PREFIX} Dana Unverified`,
    email: `${TEST_PREFIX}_dana@test.edu`,
    password: 'Password123!',
    role: 'student',
    branch: 'Computer Engineering',
    graduationYear: 2026,
    college: 'Engineering Institute of Tech',
  });
  userIdsToClean.push(studentD._id);

  projectDUnverified = await Project.create({
    userId: studentD._id,
    title: `${TEST_PREFIX} High Score Pending Web App`,
    shortDescription: 'High score candidate whose capstone has NOT yet been verified.',
    detailedDescription: 'This project must never appear in recruiter candidate search.',
    category: 'Web Development',
    technologies: ['React', 'Node.js'],
    verificationStatus: 'Pending',
    projectStatus: 'In Progress',
  });
  projectIdsToClean.push(projectDUnverified._id);
});

after(async () => {
  if (userIdsToClean.length > 0) await User.deleteMany({ _id: { $in: userIdsToClean } });
  if (projectIdsToClean.length > 0) await Project.deleteMany({ _id: { $in: projectIdsToClean } });
  if (profileIdsToClean.length > 0) await Profile.deleteMany({ _id: { $in: profileIdsToClean } });
  if (portfolioIdsToClean.length > 0) await Portfolio.deleteMany({ _id: { $in: portfolioIdsToClean } });
  if (evalIdsToClean.length > 0) await AIEvaluation.deleteMany({ _id: { $in: evalIdsToClean } });
  await mongoose.disconnect();
});

// ─── 1. Branch-only filtering ──────────────────────────────────────────────
test('REC-TC-1: Branch-only filtering returns only candidates in the specified branch', async () => {
  const result = await projectService.getProjects(
    'recruiter-user-id',
    { branch: 'Mechanical Engineering', search: TEST_PREFIX },
    'recruiter'
  );

  assert.equal(result.length, 1);
  assert.equal(result[0]._id.toString(), projectCVerified._id.toString());
  assert.equal(result[0].userId.branch, 'Mechanical Engineering');
});

// ─── 2. Graduation-year-only filtering ──────────────────────────────────────
test('REC-TC-2: Graduation-year-only filtering resolves correct cohort', async () => {
  const result = await projectService.getProjects(
    'recruiter-user-id',
    { graduationYear: 2026, search: TEST_PREFIX },
    'recruiter'
  );

  // Student A is 2026 (verified), Student D is 2026 but unverified (excluded)
  assert.equal(result.length, 1);
  assert.equal(result[0]._id.toString(), projectAVerified._id.toString());
  assert.equal(result[0].userId.graduationYear, 2026);
});

// ─── 3. Minimum AI score filtering ─────────────────────────────────────────
test('REC-TC-3: Minimum AI score filtering includes only candidates meeting threshold', async () => {
  const result = await projectService.getProjects(
    'recruiter-user-id',
    { minAiScore: 80, search: TEST_PREFIX },
    'recruiter'
  );

  // Alice (90) and Charlie (82) >= 80; Bob (65) excluded
  assert.equal(result.length, 2);
  const returnedIds = result.map((p) => p._id.toString());
  assert.ok(returnedIds.includes(projectAVerified._id.toString()));
  assert.ok(returnedIds.includes(projectCVerified._id.toString()));
  assert.ok(!returnedIds.includes(projectBVerified._id.toString()));
});

// ─── 4. Maximum AI score filtering ─────────────────────────────────────────
test('REC-TC-4: Maximum AI score filtering limits upper score bound', async () => {
  const result = await projectService.getProjects(
    'recruiter-user-id',
    { maxAiScore: 70, search: TEST_PREFIX },
    'recruiter'
  );

  // Bob (65) <= 70; Alice (90) and Charlie (82) excluded
  assert.equal(result.length, 1);
  assert.equal(result[0]._id.toString(), projectBVerified._id.toString());
  assert.equal(result[0].aiScore, 65);
});

// ─── 5. Combined branch + graduation year ───────────────────────────────────
test('REC-TC-5: Combined branch and graduation year filtering produces intersection', async () => {
  const result = await projectService.getProjects(
    'recruiter-user-id',
    {
      branch: 'Computer Engineering',
      graduationYear: 2027,
      search: TEST_PREFIX,
    },
    'recruiter'
  );

  // Bob is Computer Engineering AND 2027
  assert.equal(result.length, 1);
  assert.equal(result[0]._id.toString(), projectBVerified._id.toString());
  assert.equal(result[0].userId.fullName, studentB.fullName);
});

// ─── 6. Combined branch + minimum/maximum AI score ──────────────────────────
test('REC-TC-6: Combined branch and AI score range correctly filters candidates', async () => {
  const result = await projectService.getProjects(
    'recruiter-user-id',
    {
      branch: 'Computer Engineering',
      minAiScore: 85,
      maxAiScore: 95,
      search: TEST_PREFIX,
    },
    'recruiter'
  );

  // Alice is CompEng and score 90 (in [85, 95])
  assert.equal(result.length, 1);
  assert.equal(result[0]._id.toString(), projectAVerified._id.toString());
  assert.equal(result[0].aiScore, 90);
});

// ─── 7. All supported filters combined ─────────────────────────────────────
test('REC-TC-7: All supported filters combined together resolve exact match', async () => {
  const result = await projectService.getProjects(
    'recruiter-user-id',
    {
      branch: 'Computer Engineering',
      graduationYear: 2026,
      minAiScore: 70,
      maxAiScore: 95,
      category: 'Cloud',
      technology: 'Kubernetes',
      search: 'Microservices',
    },
    'recruiter'
  );

  assert.equal(result.length, 1);
  assert.equal(result[0]._id.toString(), projectAVerified._id.toString());
  assert.equal(result[0].category, 'Cloud');
  assert.ok(result[0].technologies.includes('Kubernetes'));
});

// ─── 8. Invalid and negative AI scores ─────────────────────────────────────
test('REC-TC-8: Invalid and negative AI scores fail Zod validation with 400', () => {
  // Negative score
  const resNegative = getProjectsQuerySchema.safeParse({ query: { minAiScore: -5 } });
  assert.equal(resNegative.success, false);
  assert.match(resNegative.error.errors[0].message, /at least 0/i);

  // Score exceeding 100
  const resOver = getProjectsQuerySchema.safeParse({ query: { maxAiScore: 105 } });
  assert.equal(resOver.success, false);
  assert.match(resOver.error.errors[0].message, /cannot exceed 100/i);

  // Non-numeric score
  const resAlpha = getProjectsQuerySchema.safeParse({ query: { minAiScore: 'not-a-number' } });
  assert.equal(resAlpha.success, false);
  assert.match(resAlpha.error.errors[0].message, /valid number/i);
});

// ─── 9. Minimum score greater than maximum score ───────────────────────────
test('REC-TC-9: Minimum score greater than maximum score fails schema refinement', () => {
  const res = getProjectsQuerySchema.safeParse({
    query: { minAiScore: 90, maxAiScore: 75 },
  });

  assert.equal(res.success, false);
  assert.match(res.error.errors[0].message, /cannot exceed maximum/i);
});

// ─── 10. Invalid graduation year ───────────────────────────────────────────
test('REC-TC-10: Invalid graduation year fails validation', () => {
  const resPast = getProjectsQuerySchema.safeParse({ query: { graduationYear: 1850 } });
  assert.equal(resPast.success, false);
  assert.match(resPast.error.errors[0].message, /after 1900/i);

  const resFuture = getProjectsQuerySchema.safeParse({ query: { graduationYear: 2200 } });
  assert.equal(resFuture.success, false);
  assert.match(resFuture.error.errors[0].message, /before 2100/i);

  const resNonInt = getProjectsQuerySchema.safeParse({ query: { graduationYear: 2025.5 } });
  assert.equal(resNonInt.success, false);
  assert.match(resNonInt.error.errors[0].message, /integer/i);
});

// ─── 11. Candidate with no AI evaluation ───────────────────────────────────
test('REC-TC-11: Candidate with no AI evaluation is excluded when AI score filter applied', async () => {
  // Create student with verified project but NO AI evaluation
  const noEvalStudent = await User.create({
    fullName: `${TEST_PREFIX} No Eval Candidate`,
    email: `${TEST_PREFIX}_noeval@test.edu`,
    password: 'Password123!',
    role: 'student',
    branch: 'Computer Engineering',
    graduationYear: 2026,
  });
  userIdsToClean.push(noEvalStudent._id);

  const noEvalProject = await Project.create({
    userId: noEvalStudent._id,
    title: `${TEST_PREFIX} Unevaluated Verified Capstone`,
    shortDescription: 'Verified project whose AI evaluation has not yet taken place.',
    detailedDescription: 'Real project awaiting deterministic AI analysis pipeline execution.',
    category: 'Web Development',
    technologies: ['React'],
    verificationStatus: 'Verified',
    projectStatus: 'Completed',
  });
  projectIdsToClean.push(noEvalProject._id);

  const result = await projectService.getProjects(
    'recruiter-user-id',
    { minAiScore: 50, search: 'Unevaluated Verified Capstone' },
    'recruiter'
  );

  assert.equal(result.length, 0, 'Candidate without AI evaluation must not match score threshold');
});

// ─── 12. Candidate with only unverified projects ───────────────────────────
test('REC-TC-12: Candidate with only unverified projects remains strictly excluded from recruiter', async () => {
  // Candidate D has AI score 95 but only Pending project
  const result = await projectService.getProjects(
    'recruiter-user-id',
    { search: 'High Score Pending Web App' },
    'recruiter'
  );

  assert.equal(result.length, 0, 'Recruiter discovery must NEVER return unverified projects');
});

// ─── 13. Mixed verified and unverified projects ────────────────────────────
test('REC-TC-13: For candidate with mixed projects, only Verified projects are exposed', async () => {
  // Candidate A has 1 Verified project (Cloud) and 1 Pending project (AI Chat)
  const result = await projectService.getProjects(
    'recruiter-user-id',
    {
      branch: 'Computer Engineering',
      graduationYear: 2026,
      search: 'Cloud Microservices Platform',
    },
    'recruiter'
  );

  assert.equal(result.length, 1);
  assert.equal(result[0]._id.toString(), projectAVerified._id.toString());
  assert.equal(result[0].verificationStatus, 'Verified');

  // Attempting to filter with search for the pending project returns 0 items
  const pendingAttempt = await projectService.getProjects(
    'recruiter-user-id',
    { search: 'Unverified AI Chat Experiment' },
    'recruiter'
  );
  assert.equal(
    pendingAttempt.length,
    0,
    'Recruiter search must never return unverified projects even if filter=Pending is passed'
  );
});

// ─── 14. Empty search results ──────────────────────────────────────────────
test('REC-TC-14: Search returning zero matches responds with clean empty result without throwing', async () => {
  const result = await projectService.getProjects(
    'recruiter-user-id',
    { branch: 'Nonexistent Astrophysics Branch', search: TEST_PREFIX },
    'recruiter'
  );

  assert.equal(result.length, 0);
  assert.equal(result.total, 0);
  assert.equal(result.pagination.total, 0);
});

// ─── 15. Pagination and total counts after filtering ────────────────────────
test('REC-TC-15: Pagination metadata accurately reflects total counts and slices after filtering', async () => {
  // Query for 2027 candidates (Bob and Charlie -> 2 items) with limit=1
  const page1 = await projectService.getProjects(
    'recruiter-user-id',
    { graduationYear: 2027, search: TEST_PREFIX, page: 1, limit: 1 },
    'recruiter'
  );

  assert.equal(page1.length, 1);
  assert.equal(page1.total, 2);
  assert.equal(page1.pagination.total, 2);
  assert.equal(page1.pagination.page, 1);
  assert.equal(page1.pagination.limit, 1);
  assert.equal(page1.pagination.totalPages, 2);
  assert.equal(page1.pagination.hasMore, true);

  const page2 = await projectService.getProjects(
    'recruiter-user-id',
    { graduationYear: 2027, search: TEST_PREFIX, page: 2, limit: 1 },
    'recruiter'
  );

  assert.equal(page2.length, 1);
  assert.equal(page2.pagination.page, 2);
  assert.equal(page2.pagination.hasMore, false);
  assert.notEqual(page1[0]._id.toString(), page2[0]._id.toString());
});

// ─── 16. Unauthorized role attempting recruiter search ─────────────────────
test('REC-TC-16: Unauthorized role attempting recruiter search filters throws 403 Forbidden', async () => {
  await assert.rejects(
    async () => {
      await projectService.getProjects(
        studentA._id,
        { branch: 'Computer Engineering' },
        'student'
      );
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /restricted to recruiters/i);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await projectService.getProjects(
        'faculty-id',
        { minAiScore: 70 },
        'faculty'
      );
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /restricted to recruiters/i);
      return true;
    }
  );
});
