import mongoose from 'mongoose';
import env from '../config/env.js';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import Certificate from '../models/certificate.model.js';
import Profile from '../models/profile.model.js';
import aiService from '../services/ai.service.js';

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

async function runTests() {
  console.log('\n=== VidyaLink – AI Service Foundation Integration Test Suite ===\n');
  console.log(`Target AI Service: ${aiService.baseUrl}`);

  await mongoose.connect(env.MONGODB_URI);

  // ── Setup Test Actors ─────────────────────────────────────────
  const timestamp = Date.now();
  const testStudent = await User.create({
    fullName: `AI Test Student ${timestamp}`,
    email: `ai_student_${timestamp}@vidyalink.test`,
    password: 'Password123!',
    role: 'student',
    college: 'Engineering Institute of Technology',
    branch: 'Computer Science',
  });

  const testProject = await Project.create({
    userId: testStudent._id,
    title: 'AI Verification Framework',
    shortDescription: 'Microservice pipeline for portfolio audit',
    detailedDescription: 'Full-stack platform evaluating student technical assets against industry standards.',
    category: 'AI / ML',
    technologies: ['Python', 'FastAPI', 'Node.js', 'React'],
    verificationStatus: 'Pending',
  });

  const testCertificate = await Certificate.create({
    userId: testStudent._id,
    title: 'Certified Cloud Architect',
    issuer: 'Cloud Institute',
    category: 'Cloud Certification',
    issueDate: new Date(),
    certificateFile: {
      originalFileName: 'cloud_cert.pdf',
      storedFileName: 'stored_cert.pdf',
      fileUrl: 'https://example.com/cert.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
    },
    skills: ['Cloud', 'Kubernetes'],
    verificationStatus: 'Pending',
  });

  const testProfile = await Profile.create({
    user: testStudent._id,
    fullName: testStudent.fullName,
    college: testStudent.college,
    branch: testStudent.branch,
    skills: ['Python', 'Node.js', 'FastAPI', 'Docker'],
  });

  try {
    // ── Test 1: AI Health Endpoint ──────────────────────────────
    console.log('\n--- 1. AI Service Health Check ---');
    try {
      const health = await aiService.checkHealth();
      assert(health?.success === true, 'Health check returns success: true');
      assert(health?.service === 'vidyalink-ai', 'Health check returns service name vidyalink-ai');
      assert(health?.status === 'healthy', 'Health check returns status: healthy');
    } catch (err) {
      assert(false, `Health check reachable (Error: ${err.message})`);
    }

    // ── Test 2: Reject Unverified Portfolio Data ────────────────
    console.log('\n--- 2. Unverified Portfolio Rejection (Critical Security Rule) ---');
    try {
      await aiService.evaluateVerifiedPortfolio(testStudent._id);
      assert(false, 'Should reject portfolio with zero verified assets');
    } catch (err) {
      assert(err.statusCode === 400, 'Throws 400 Bad Request when portfolio is unverified');
      assert(
        err.message.includes('verified portfolio asset'),
        'Rejection message explicitly specifies verification required'
      );
    }

    // ── Test 3: Evaluate Verified Portfolio ─────────────────────
    console.log('\n--- 3. Verified Portfolio Evaluation Flow ---');
    // Mark project and certificate as Verified
    testProject.verificationStatus = 'Verified';
    await testProject.save();

    testCertificate.verificationStatus = 'Verified';
    await testCertificate.save();

    try {
      const result = await aiService.evaluateVerifiedPortfolio(testStudent._id);
      assert(result?.status === 'evaluation_pending', 'Evaluation result returns status: evaluation_pending');
      assert(result?.portfolioScore === null, 'Portfolio score is null placeholder (no fake scores)');
      assert(Array.isArray(result?.skills), 'Normalized skills list returned as array');
      assert(result.skills.includes('Python'), 'Extracted verified project skills included in normalized payload');
      assert(Boolean(result.evaluatedAt), 'Includes ISO evaluation timestamp');
    } catch (err) {
      assert(false, `Verified portfolio evaluation succeeded (Error: ${err.message})`);
    }

    // ── Test 4: AI Service Unavailable / Timeout Simulation ─────
    console.log('\n--- 4. Error Handling: Service Unavailable Simulation ---');
    const offlineAiService = Object.assign(Object.create(Object.getPrototypeOf(aiService)), aiService, {
      baseUrl: 'http://127.0.0.1:59999', // non-existent port
      timeoutMs: 1000,
    });

    try {
      await offlineAiService.checkHealth();
      assert(false, 'Should fail when AI service is offline');
    } catch (err) {
      assert(err.statusCode === 503, 'Throws 503 Service Unavailable when AI server is unreachable');
      assert(
        !err.message.includes('ECONNREFUSED'),
        'Sanitizes raw low-level connection errors before exposing to caller'
      );
    }

    console.log('\n--- 5. Error Handling: Gateway Timeout Simulation ---');
    const timeoutAiService = Object.assign(Object.create(Object.getPrototypeOf(aiService)), aiService, {
      timeoutMs: 1, // 1ms forces immediate timeout
    });

    try {
      await timeoutAiService.evaluateVerifiedPortfolio(testStudent._id);
      assert(false, 'Should fail on timeout');
    } catch (err) {
      assert(
        err.statusCode === 504 || err.statusCode === 503,
        `Handles request timeout gracefully (Got HTTP ${err.statusCode})`
      );
    }

  } finally {
    // ── Cleanup Test Records ────────────────────────────────────
    await Promise.all([
      User.deleteMany({ _id: testStudent._id }),
      Project.deleteMany({ userId: testStudent._id }),
      Certificate.deleteMany({ userId: testStudent._id }),
      Profile.deleteMany({ user: testStudent._id }),
    ]);

    await mongoose.disconnect();
  }

  console.log('\n=== TEST RESULTS SUMMARY ===');
  console.log(`Passed : ${passed}`);
  console.log(`Failed : ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\nALL INTEGRATION TESTS PASSED PERFECTLY!\n');
  }
}

runTests().catch((err) => {
  console.error('Fatal error during AI test runner:', err);
  process.exit(1);
});
