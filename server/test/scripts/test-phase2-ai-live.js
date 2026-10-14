/* global fetch */
import mongoose from 'mongoose';
import { env } from '../../src/config/env.js';
import User from '../../src/models/user.model.js';
import Project from '../../src/models/project.model.js';
import Portfolio from '../../src/models/portfolio.model.js';
import AIEvaluation from '../../src/models/aiEvaluation.model.js';
import AIAnalysis from '../../src/models/aiAnalysis.model.js';
import aiIntegrationService from '../../src/services/aiIntegration.service.js';
import { generateAccessToken } from '../../src/utils/jwt.util.js';

const BASE_URL = `http://127.0.0.1:${env.PORT || 5000}/api/v1`;

async function main() {
  console.log('====================================================');
  console.log('PHASE 2: CRITICAL AI EVALUATION REGRESSION AUDIT');
  console.log('====================================================\n');

  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected to MongoDB:', mongoose.connection.name);

  // 1. UNIT & HEURISTIC TESTS ON FINGERPRINTING & CIRCULAR REFERENCES
  console.log('\n--- 1. Testing Fingerprinting & Circular Reference Safety ---');
  const auditPrefix = `live_ai_${Date.now()}`;
  const testStudent = await User.create({
    fullName: `${auditPrefix} Student`,
    email: `${auditPrefix}@vidyalink.edu`,
    password: 'Password123!',
    role: 'student',
    branch: 'Computer Engineering',
    graduationYear: 2026,
    status: 'active',
  });

  const circularObj = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Distributed System Node',
    createdAt: new Date(),
    technologies: ['Node.js', 'Go', null, undefined],
    metadata: {
      nested: {
        value: 42,
        nullVal: null,
      },
    },
  };
  circularObj.metadata.self = circularObj; // Circular reference!
  circularObj.arrayWithCycle = [circularObj];

  let fpResult1 = null;
  let fpResult2 = null;
  try {
    const fakePortfolio = {
      _id: new mongoose.Types.ObjectId(),
      student: testStudent._id,
      project: circularObj,
      skillsVerified: ['Node.js'],
      updatedAt: new Date(),
    };
    fakePortfolio.circularRef = fakePortfolio;

    const prep1 = await aiIntegrationService.getPortfolioSourceFingerprint(fakePortfolio, testStudent._id);
    fpResult1 = prep1.contentHash;

    const prep2 = await aiIntegrationService.getPortfolioSourceFingerprint(fakePortfolio, testStudent._id);
    fpResult2 = prep2.contentHash;

    if (fpResult1 && fpResult1 === fpResult2) {
      console.log('✅ PASS: Circular references handled safely without recursion.');
      console.log('   Hash 1:', fpResult1);
      console.log('   Hash 2:', fpResult2);
      console.log('   Identical input produces identical hash: YES');
    } else {
      console.error('❌ FAIL: Non-deterministic hash or empty result');
    }
  } catch (err) {
    console.error('❌ FAIL: Recursion error thrown during fingerprinting:', err.message);
    process.exit(1);
  }

  // 2. CANONICAL SCORING FORMULA CHECK
  console.log('\n--- 2. Checking Canonical Scoring Formula ---');
  // Check against FastAPI AI service
  const weightsRes = await fetch(`${env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}/api/v1/portfolio/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: 'test-student-1',
      name: 'Test Candidate',
      skills: ['Python', 'Docker'],
      projects: [{
        title: 'Cloud Orchestrator',
        description: 'A distributed Kubernetes controller handling replication and dynamic scheduling across multi-cloud regions with clean test architecture.',
        technologies: ['Go', 'Docker', 'Kubernetes', 'gRPC'],
        github_url: 'https://github.com/test/cloud-orchestrator',
        documentation: 'Full architecture overview, API documentation, and testing benchmarks.',
        complexity_indicators: ['distributed', 'pipeline'],
        innovation_indicators: ['novel', 'optimization'],
        code_quality_indicators: ['testing', 'ci', 'clean code'],
        verified: true,
      }],
      github: { repository_count: 5, recent_activity: true },
      education: [],
      certificates: [],
      resume: null,
    }),
  });

  const aiEvalData = await weightsRes.json();
  console.log('   FastAPI AI Service Status:', weightsRes.status);
  console.log('   Component Scores:', aiEvalData.component_scores);
  console.log('   Weighted Breakdown:', aiEvalData.weighted_breakdown);
  console.log('   Overall Score:', aiEvalData.overall_score);

  // Canonical formula verification:
  // Project Complexity: 25% (0.25)
  // Technology Stack: 20% (0.20)
  // GitHub Activity: 15% (0.15)
  // Documentation Quality: 15% (0.15)
  // Innovation: 15% (0.15)
  // Code Quality: 10% (0.10)
  const cs = aiEvalData.component_scores;

  const expectedWeightedSum = Math.round(
    cs.complexity * 0.25 +
    cs.technology_stack * 0.20 +
    cs.github_activity * 0.15 +
    cs.documentation_quality * 0.15 +
    cs.innovation * 0.15 +
    cs.code_quality * 0.10
  );

  console.log('   Calculated from canonical weights:', expectedWeightedSum);
  console.log('   AI Service Overall Score:', aiEvalData.overall_score);
  if (Math.abs(expectedWeightedSum - aiEvalData.overall_score) <= 1) {
    console.log('✅ PASS: Canonical scoring weights strictly verified (25%, 20%, 15%, 15%, 15%, 10%).');
  } else {
    console.error('❌ FAIL: Canonical scoring formula does not match.');
  }

  // 3. LIVE ENDPOINTS: POST /api/v1/ai/portfolio/evaluate ON LIVE EXPRESS SERVER
  console.log('\n--- 3. Testing Live POST /api/v1/ai/portfolio/evaluate on Express Server ---');
  const studentToken = generateAccessToken({ _id: testStudent._id.toString(), role: 'student' });

  // Create verified project and portfolio
  const verifiedProj = await Project.create({
    userId: testStudent._id,
    title: `${auditPrefix} Production Ledger`,
    shortDescription: 'High integrity cryptographic ledger.',
    detailedDescription: 'Distributed append-only immutable ledger using raft consensus with rigorous integration test suite.',
    category: 'Blockchain',
    domain: 'Distributed Systems',
    technologies: ['Rust', 'PostgreSQL', 'Docker'],
    verificationStatus: 'Verified',
    projectStatus: 'Completed',
  });

  const verifiedPortfolio = await Portfolio.create({
    certificateId: `VLC-TEST-${Date.now()}`,
    student: testStudent._id,
    project: verifiedProj._id,
    projectTitle: verifiedProj.title,
    verifiedBy: new mongoose.Types.ObjectId(),
    skillsVerified: ['Rust', 'PostgreSQL'],
    verificationHash: 'verified_crypto_hash_12345',
  });

  // Call POST /api/v1/ai/portfolio/evaluate
  console.log('   Calling POST /api/v1/ai/portfolio/evaluate with valid portfolio...');
  const evalRes = await fetch(`${BASE_URL}/ai/portfolio/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ portfolioId: verifiedPortfolio._id.toString() }),
  });

  const evalJson = await evalRes.json();
  console.log('   Response Status:', evalRes.status);
  console.log('   Response Body:', JSON.stringify(evalJson, null, 2));

  if (evalRes.status === 200 && evalJson.data?.evaluation?.overallScore) {
    console.log('✅ PASS: Portfolio evaluation succeeded with valid verified portfolio.');
  } else {
    console.error('❌ FAIL: Portfolio evaluation failed:', evalJson);
  }

  // Check MongoDB persistence
  const persistedEval = await AIEvaluation.findOne({ portfolioId: verifiedPortfolio._id });
  if (persistedEval && persistedEval.overallScore === evalJson.data.evaluation.overallScore) {
    console.log('✅ PASS: Evaluation persisted successfully in MongoDB AIEvaluation collection.');
    console.log('   Persisted ID:', persistedEval._id.toString(), 'Overall Score:', persistedEval.overallScore);
  } else {
    console.error('❌ FAIL: Evaluation not persisted in MongoDB.');
  }

  // 4. REPEATED IDENTICAL INPUTS PRODUCE IDENTICAL RESULTS (DEDUPLICATION)
  console.log('\n--- 4. Testing Repeated Identical Input (Deduplication) ---');
  const evalRes2 = await fetch(`${BASE_URL}/ai/portfolio/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ portfolioId: verifiedPortfolio._id.toString() }),
  });
  const evalJson2 = await evalRes2.json();
  console.log('   Repeated Call Status:', evalRes2.status);
  console.log('   Deduplicated flag:', evalJson2.data?.deduplicated);
  console.log('   Score matches previous:', evalJson2.data?.evaluation?.overallScore === evalJson.data?.evaluation?.overallScore);

  if (evalJson2.data?.deduplicated === true && evalJson2.data?.evaluation?.overallScore === evalJson.data?.evaluation?.overallScore) {
    console.log('✅ PASS: Repeated identical input returns deduplicated result with identical score.');
  } else {
    console.error('❌ FAIL: Deduplication did not trigger or scores differ.');
  }

  // 5. INDUSTRY READINESS CALCULATION AFTER PORTFOLIO EVALUATION
  console.log('\n--- 5. Testing Industry Readiness Calculation ---');
  const readinessRes = await fetch(`${BASE_URL}/ai/portfolio/readiness`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ portfolioId: verifiedPortfolio._id.toString() }),
  });
  const readinessJson = await readinessRes.json();
  console.log('   Readiness Status:', readinessRes.status);
  console.log('   Readiness Result:', readinessJson.data?.analysis?.result);

  if (readinessRes.status === 200 && (readinessJson.data?.analysis?.result?.readiness_score !== undefined || readinessJson.data?.analysis?.result?.overall_readiness_score !== undefined)) {
    console.log('✅ PASS: Industry readiness calculated successfully after portfolio evaluation.');
    console.log('   Readiness Score:', readinessJson.data.analysis.result.readiness_score ?? readinessJson.data.analysis.result.overall_readiness_score);
    console.log('   Category / Tier:', readinessJson.data.analysis.result.category ?? readinessJson.data.analysis.result.readiness_tier);
  } else {
    console.error('❌ FAIL: Readiness calculation failed:', readinessJson);
  }

  // 6. EVALUATION REJECTS OR EXCLUDES UNVERIFIED AND REJECTED PROJECTS
  console.log('\n--- 6. Testing Exclusion of Unverified/Rejected Projects ---');
  const unverifiedStudent = await User.create({
    fullName: `${auditPrefix} Unverified Student`,
    email: `${auditPrefix}_unverified@vidyalink.edu`,
    password: 'Password123!',
    role: 'student',
    branch: 'Computer Engineering',
    status: 'active',
  });
  const unverifiedStudentToken = generateAccessToken({ _id: unverifiedStudent._id.toString(), role: 'student' });

  // Project with Pending status
  await Project.create({
    userId: unverifiedStudent._id,
    title: `${auditPrefix} Pending Draft App`,
    shortDescription: 'Unverified app',
    detailedDescription: 'This project is still pending faculty review.',
    category: 'Web Development',
    technologies: ['React', 'Node.js'],
    verificationStatus: 'Pending',
  });

  const unverifiedEvalRes = await fetch(`${BASE_URL}/ai/portfolio/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${unverifiedStudentToken}`,
    },
    body: JSON.stringify({}),
  });
  const unverifiedEvalJson = await unverifiedEvalRes.json();
  console.log('   Unverified Evaluation Status:', unverifiedEvalRes.status);
  console.log('   Unverified Evaluation Body:', unverifiedEvalJson);

  if (unverifiedEvalJson.data?.status === 'insufficient_evidence') {
    console.log('✅ PASS: Unverified student project produces truthful insufficient_evidence status.');
    console.log('   Reason:', unverifiedEvalJson.data.reason);
  } else {
    console.error('❌ FAIL: Unverified project was not rejected/gated.');
  }

  // Clean up
  await User.deleteMany({ _id: { $in: [testStudent._id, unverifiedStudent._id] } });
  await Project.deleteMany({ userId: { $in: [testStudent._id, unverifiedStudent._id] } });
  await Portfolio.deleteMany({ student: { $in: [testStudent._id, unverifiedStudent._id] } });
  await AIEvaluation.deleteMany({ studentId: { $in: [testStudent._id, unverifiedStudent._id] } });
  await AIAnalysis.deleteMany({ studentId: { $in: [testStudent._id, unverifiedStudent._id] } });

  console.log('\n====================================================');
  console.log('ALL PHASE 2 LIVE REGRESSION CHECKS COMPLETED!');
  console.log('====================================================');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
