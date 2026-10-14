/* global fetch */

import mongoose from 'mongoose';
import http from 'node:http';
import { createApp } from '../../src/app.js';
import User from '../../src/models/user.model.js';
import Project from '../../src/models/project.model.js';
import Portfolio from '../../src/models/portfolio.model.js';
import AIEvaluation from '../../src/models/aiEvaluation.model.js';
import { env } from '../../src/config/env.js';
import { generateAccessToken } from '../../src/utils/jwt.util.js';

const PORT = 5056;

const run = async () => {
  console.log('============================================================');
  console.log('VIDYALINK — LIVE RECRUITER SEARCH & BACKEND FILTERING AUDIT');
  console.log('============================================================\n');

  await mongoose.connect(env.MONGODB_URI);
  console.log(`[DB] Connected to MongoDB: ${mongoose.connection.name}`);

  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://127.0.0.1:${PORT}/api/v1`;
  console.log(`[SERVER] Live test server listening on ${baseUrl}\n`);

  const auditPrefix = `live_rec_${Date.now()}`;
  let cleanUserIds = [];
  let cleanProjectIds = [];
  let cleanPortfolioIds = [];
  let cleanEvalIds = [];

  try {
    // 1. Create Recruiter User
    const recruiterUser = await User.create({
      fullName: `${auditPrefix} Test Recruiter`,
      email: `${auditPrefix}_recruiter@company.com`,
      password: 'Password123!',
      role: 'recruiter',
      status: 'active',
    });
    cleanUserIds.push(recruiterUser._id);
    const recruiterToken = generateAccessToken({
      _id: recruiterUser._id.toString(),
      role: recruiterUser.role,
    });

    // 2. Create Student User (for RBAC check)
    const studentUser = await User.create({
      fullName: `${auditPrefix} Student Hacker`,
      email: `${auditPrefix}_student@test.edu`,
      password: 'Password123!',
      role: 'student',
      branch: 'Computer Engineering',
      graduationYear: 2026,
      status: 'active',
    });
    cleanUserIds.push(studentUser._id);
    const studentToken = generateAccessToken({
      _id: studentUser._id.toString(),
      role: studentUser.role,
    });

    // 3. Create Candidate 1: Comp Eng, 2026, Score 92, Verified
    const cand1 = await User.create({
      fullName: `${auditPrefix} Candidate 1`,
      email: `${auditPrefix}_c1@test.edu`,
      password: 'Password123!',
      role: 'student',
      branch: 'Computer Engineering',
      graduationYear: 2026,
      status: 'active',
    });
    cleanUserIds.push(cand1._id);

    const proj1 = await Project.create({
      userId: cand1._id,
      title: `${auditPrefix} Cloud Microservices Orchestrator`,
      shortDescription: 'High-performance cloud distributed orchestration engine.',
      detailedDescription: 'Full Kubernetes controller implementation in Go and gRPC.',
      category: 'Cloud',
      technologies: ['Kubernetes', 'Go', 'Docker'],
      verificationStatus: 'Verified',
      projectStatus: 'Completed',
    });
    cleanProjectIds.push(proj1._id);

    const port1 = await Portfolio.create({
      certificateId: `VLC-${Date.now()}-1`,
      student: cand1._id,
      project: proj1._id,
      projectTitle: proj1.title,
      verifiedBy: new mongoose.Types.ObjectId(),
      skillsVerified: ['Go', 'Cloud'],
      verificationHash: 'vhash1',
    });
    cleanPortfolioIds.push(port1._id);

    const eval1 = await AIEvaluation.create({
      studentId: cand1._id,
      portfolioId: port1._id,
      overallScore: 92,
      category: 'Excellent',
      componentScores: { codeQuality: 94 },
      weightedBreakdown: { codeQuality: 94 },
      provider: 'deterministic',
      model: 'deterministic-heuristics',
      version: '1.0.0',
      evaluationStatus: 'COMPLETED',
    });
    cleanEvalIds.push(eval1._id);

    // 4. Create Candidate 2: Mechanical Eng, 2027, Score 68, Verified
    const cand2 = await User.create({
      fullName: `${auditPrefix} Candidate 2`,
      email: `${auditPrefix}_c2@test.edu`,
      password: 'Password123!',
      role: 'student',
      branch: 'Mechanical Engineering',
      graduationYear: 2027,
      status: 'active',
    });
    cleanUserIds.push(cand2._id);

    const proj2 = await Project.create({
      userId: cand2._id,
      title: `${auditPrefix} Smart CAD Simulation Tool`,
      shortDescription: 'Automated mechanical thermal stress finite element analysis.',
      detailedDescription: 'Computational simulation of heat transfer on turbine blades.',
      category: 'IoT',
      technologies: ['Python', 'C++', 'OpenFOAM'],
      verificationStatus: 'Verified',
      projectStatus: 'Completed',
    });
    cleanProjectIds.push(proj2._id);

    const port2 = await Portfolio.create({
      certificateId: `VLC-${Date.now()}-2`,
      student: cand2._id,
      project: proj2._id,
      projectTitle: proj2.title,
      verifiedBy: new mongoose.Types.ObjectId(),
      skillsVerified: ['Simulation'],
      verificationHash: 'vhash2',
    });
    cleanPortfolioIds.push(port2._id);

    const eval2 = await AIEvaluation.create({
      studentId: cand2._id,
      portfolioId: port2._id,
      overallScore: 68,
      category: 'Good',
      componentScores: { codeQuality: 70 },
      weightedBreakdown: { codeQuality: 70 },
      provider: 'deterministic',
      model: 'deterministic-heuristics',
      version: '1.0.0',
      evaluationStatus: 'COMPLETED',
    });
    cleanEvalIds.push(eval2._id);

    // 5. Create Candidate 3: Comp Eng, 2026, Score 98, UNVERIFIED (Pending)
    const cand3 = await User.create({
      fullName: `${auditPrefix} Candidate 3 Unverified`,
      email: `${auditPrefix}_c3@test.edu`,
      password: 'Password123!',
      role: 'student',
      branch: 'Computer Engineering',
      graduationYear: 2026,
      status: 'active',
    });
    cleanUserIds.push(cand3._id);

    const proj3 = await Project.create({
      userId: cand3._id,
      title: `${auditPrefix} Pending Blockchain Vault`,
      shortDescription: 'Unverified cryptocurrency vault prototype with high scores.',
      detailedDescription: 'Pending verification and must remain hidden from recruiters.',
      category: 'Blockchain',
      technologies: ['Solidity', 'Ethereum'],
      verificationStatus: 'Pending',
      projectStatus: 'In Progress',
    });
    cleanProjectIds.push(proj3._id);

    console.log('[FIXTURES] Created isolated candidates and project records.\n');

    // TEST 1: Live HTTP Branch Filter
    console.log('--- TEST 1: Live HTTP Branch Filter ---');
    const branchRes = await fetch(
      `${baseUrl}/projects?branch=Computer%20Engineering&search=${auditPrefix}`,
      { headers: { Authorization: `Bearer ${recruiterToken}` } }
    );
    const branchData = await branchRes.json();
    console.log(`Status: ${branchRes.status}`);
    console.log(`Matches found: ${branchData.data.projects.length}`);
    if (
      branchRes.status === 200 &&
      branchData.data.projects.length === 1 &&
      branchData.data.projects[0]._id === proj1._id.toString()
    ) {
      console.log('✅ PASS: Only Computer Engineering verified project returned.\n');
    } else {
      throw new Error(`FAIL: Unexpected branch filter response: ${JSON.stringify(branchData)}`);
    }

    // TEST 2: Live HTTP Graduation Year Filter
    console.log('--- TEST 2: Live HTTP Graduation Year Filter ---');
    const gradRes = await fetch(
      `${baseUrl}/projects?graduationYear=2027&search=${auditPrefix}`,
      { headers: { Authorization: `Bearer ${recruiterToken}` } }
    );
    const gradData = await gradRes.json();
    console.log(`Status: ${gradRes.status}`);
    console.log(`Matches found: ${gradData.data.projects.length}`);
    if (
      gradRes.status === 200 &&
      gradData.data.projects.length === 1 &&
      gradData.data.projects[0]._id === proj2._id.toString()
    ) {
      console.log('✅ PASS: Only 2027 graduation year candidate returned.\n');
    } else {
      throw new Error(`FAIL: Unexpected graduationYear response: ${JSON.stringify(gradData)}`);
    }

    // TEST 3: Live HTTP Score Range (minAiScore=80, maxAiScore=100)
    console.log('--- TEST 3: Live HTTP AI Score Range Filter ---');
    const scoreRes = await fetch(
      `${baseUrl}/projects?minAiScore=80&maxAiScore=100&search=${auditPrefix}`,
      { headers: { Authorization: `Bearer ${recruiterToken}` } }
    );
    const scoreData = await scoreRes.json();
    console.log(`Status: ${scoreRes.status}`);
    console.log(`Matches found: ${scoreData.data.projects.length}`);
    if (
      scoreRes.status === 200 &&
      scoreData.data.projects.length === 1 &&
      scoreData.data.projects[0]._id === proj1._id.toString() &&
      scoreData.data.projects[0].aiScore === 92
    ) {
      console.log('✅ PASS: Only verified candidate with score in [80, 100] returned.\n');
    } else {
      throw new Error(`FAIL: Unexpected AI score response: ${JSON.stringify(scoreData)}`);
    }

    // TEST 4: Live HTTP Combined Filters
    console.log('--- TEST 4: Live HTTP Combined Filters (Branch + Year + AI Score) ---');
    const combinedRes = await fetch(
      `${baseUrl}/projects?branch=Computer%20Engineering&graduationYear=2026&minAiScore=70&maxAiScore=95&search=${auditPrefix}`,
      { headers: { Authorization: `Bearer ${recruiterToken}` } }
    );
    const combinedData = await combinedRes.json();
    console.log(`Status: ${combinedRes.status}`);
    console.log(`Matches found: ${combinedData.data.projects.length}`);
    if (
      combinedRes.status === 200 &&
      combinedData.data.projects.length === 1 &&
      combinedData.data.projects[0]._id === proj1._id.toString()
    ) {
      console.log('✅ PASS: All combined filters matched exact record.\n');
    } else {
      throw new Error(`FAIL: Combined filters failed: ${JSON.stringify(combinedData)}`);
    }

    // TEST 5: Live Verification Policy Guard (Ensure Pending proj3 is never exposed)
    console.log('--- TEST 5: Live Verification Gate Security ---');
    const unverifiedRes = await fetch(
      `${baseUrl}/projects?search=Pending%20Blockchain%20Vault`,
      { headers: { Authorization: `Bearer ${recruiterToken}` } }
    );
    const unverifiedData = await unverifiedRes.json();
    console.log(`Status: ${unverifiedRes.status}`);
    console.log(`Matches found: ${unverifiedData.data.projects.length}`);
    if (unverifiedRes.status === 200 && unverifiedData.data.projects.length === 0) {
      console.log('✅ PASS: Unverified project strictly gated from recruiter access.\n');
    } else {
      throw new Error(`FAIL: Unverified project leaked to recruiter: ${JSON.stringify(unverifiedData)}`);
    }

    // TEST 6: Student Attempting Recruiter Filters (RBAC)
    console.log('--- TEST 6: Student Attempting Candidate Search Filters (RBAC) ---');
    const rbacRes = await fetch(
      `${baseUrl}/projects?minAiScore=80`,
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    const _rbacData = await rbacRes.json();
    console.log(`Status: ${rbacRes.status}`);
    if (rbacRes.status === 403) {
      console.log('✅ PASS: Student role rejected with 403 Forbidden.\n');
    } else {
      throw new Error(`FAIL: Student should have been rejected with 403, got: ${rbacRes.status}`);
    }

    // TEST 7: Pagination Metadata
    console.log('--- TEST 7: Database-Level Pagination Metadata ---');
    const pageRes = await fetch(
      `${baseUrl}/projects?search=${auditPrefix}&page=1&limit=1`,
      { headers: { Authorization: `Bearer ${recruiterToken}` } }
    );
    const pageData = await pageRes.json();
    console.log(`Status: ${pageRes.status}`);
    console.log('Pagination Metadata:', pageData.data.pagination);
    if (
      pageRes.status === 200 &&
      pageData.data.projects.length === 1 &&
      pageData.data.pagination.total === 2 &&
      pageData.data.pagination.totalPages === 2 &&
      pageData.data.pagination.hasMore === true
    ) {
      console.log('✅ PASS: Server-side pagination metadata matches database counts.\n');
    } else {
      throw new Error(`FAIL: Pagination failed: ${JSON.stringify(pageData)}`);
    }

    console.log('============================================================');
    console.log('ALL LIVE RECRUITER SEARCH INTEGRATION CHECKS PASSED (7/7)');
    console.log('============================================================');
  } finally {
    // Cleanup fixtures
    if (cleanUserIds.length > 0) await User.deleteMany({ _id: { $in: cleanUserIds } });
    if (cleanProjectIds.length > 0) await Project.deleteMany({ _id: { $in: cleanProjectIds } });
    if (cleanPortfolioIds.length > 0) await Portfolio.deleteMany({ _id: { $in: cleanPortfolioIds } });
    if (cleanEvalIds.length > 0) await AIEvaluation.deleteMany({ _id: { $in: cleanEvalIds } });

    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    console.log('\n[CLEANUP] Server stopped and test records cleaned up.');
  }
};

run().catch((err) => {
  console.error('\n❌ Live recruiter search audit failed:', err);
  process.exitCode = 1;
});
