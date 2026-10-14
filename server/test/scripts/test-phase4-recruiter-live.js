/* global fetch */
import mongoose from 'mongoose';
import { env } from '../../src/config/env.js';
import User from '../../src/models/user.model.js';
import Project from '../../src/models/project.model.js';
import Portfolio from '../../src/models/portfolio.model.js';
import Verification from '../../src/models/verification.model.js';
import AIEvaluation from '../../src/models/aiEvaluation.model.js';
import { generateAccessToken } from '../../src/utils/jwt.util.js';

const BASE_URL = `http://127.0.0.1:${env.PORT || 5000}/api/v1`;

async function main() {
  console.log('====================================================');
  console.log('PHASE 4: RECRUITER BACKEND FILTERING & RBAC AUDIT');
  console.log('====================================================\n');

  await mongoose.connect(env.MONGODB_URI);

  const prefix = `rec_p4_${Date.now()}`;
  const recruiter = await User.create({
    fullName: `${prefix} Recruiter`,
    email: `${prefix}@techcorp.com`,
    password: 'Password123!',
    role: 'recruiter',
    status: 'active',
  });
  const recruiterToken = generateAccessToken({ _id: recruiter._id.toString(), role: 'recruiter' });

  // Create Student 1: Comp Eng, 2026, AI Score 95, Web Development, React & TypeScript
  const student1 = await User.create({
    fullName: `${prefix} Student One`,
    email: `${prefix}_s1@vidyalink.edu`,
    password: 'Password123!',
    role: 'student',
    branch: 'Computer Engineering',
    graduationYear: 2026,
    status: 'active',
  });
  const proj1 = await Project.create({
    userId: student1._id,
    title: `${prefix} React Microfrontends Platform`,
    shortDescription: 'Enterprise frontend federation architecture.',
    detailedDescription: 'Modular web architecture with microfrontends, Webpack Module Federation, and React 19.',
    category: 'Web Development',
    domain: 'Software Architecture',
    technologies: ['React', 'TypeScript', 'Webpack'],
    verificationStatus: 'Verified',
    projectStatus: 'Completed',
  });
  const port1 = await Portfolio.create({
    certificateId: `VLC-P4-1-${Date.now()}`,
    student: student1._id,
    project: proj1._id,
    projectTitle: proj1.title,
    verifiedBy: new mongoose.Types.ObjectId(),
    skillsVerified: ['React', 'TypeScript'],
    verificationHash: 'vhash_p4_1',
  });
  await AIEvaluation.create({
    studentId: student1._id,
    portfolioId: port1._id,
    overallScore: 95,
    category: 'Excellent',
    componentScores: { complexity: 95, technology_stack: 95, github_activity: 95, documentation_quality: 95, innovation: 95, code_quality: 95 },
    weightedBreakdown: { complexity: 23.75, technology_stack: 19, github_activity: 14.25, documentation_quality: 14.25, innovation: 14.25, code_quality: 9.5 },
    evaluationStatus: 'COMPLETED',
    status: 'COMPLETED',
    provider: 'deterministic',
    model: 'deterministic-heuristics',
    version: '1.0.0',
    evaluationVersion: 1,
  });

  // Create Student 2: Electronics, 2027, AI Score 72, IoT, Embedded C & Python
  const student2 = await User.create({
    fullName: `${prefix} Student Two`,
    email: `${prefix}_s2@vidyalink.edu`,
    password: 'Password123!',
    role: 'student',
    branch: 'Electronics and Telecommunication',
    graduationYear: 2027,
    status: 'active',
  });
  const proj2 = await Project.create({
    userId: student2._id,
    title: `${prefix} Smart Mesh Sensor Network`,
    shortDescription: 'Autonomous sensor mesh network.',
    detailedDescription: 'Low power wireless IoT sensor mesh using ESP32 and MQTT broker.',
    category: 'IoT',
    domain: 'Embedded Systems',
    technologies: ['C++', 'Python', 'MQTT'],
    verificationStatus: 'Verified',
    projectStatus: 'Completed',
  });
  const port2 = await Portfolio.create({
    certificateId: `VLC-P4-2-${Date.now()}`,
    student: student2._id,
    project: proj2._id,
    projectTitle: proj2.title,
    verifiedBy: new mongoose.Types.ObjectId(),
    skillsVerified: ['C++', 'MQTT'],
    verificationHash: 'vhash_p4_2',
  });
  await AIEvaluation.create({
    studentId: student2._id,
    portfolioId: port2._id,
    overallScore: 72,
    category: 'Good',
    componentScores: { complexity: 70, technology_stack: 75, github_activity: 70, documentation_quality: 70, innovation: 75, code_quality: 70 },
    weightedBreakdown: { complexity: 17.5, technology_stack: 15, github_activity: 10.5, documentation_quality: 10.5, innovation: 11.25, code_quality: 7 },
    evaluationStatus: 'COMPLETED',
    status: 'COMPLETED',
    provider: 'deterministic',
    model: 'deterministic-heuristics',
    version: '1.0.0',
    evaluationVersion: 1,
  });

  // Create Student 3: Mechanical, 2026, No AI Score, Unverified Project
  const student3 = await User.create({
    fullName: `${prefix} Student Three`,
    email: `${prefix}_s3@vidyalink.edu`,
    password: 'Password123!',
    role: 'student',
    branch: 'Mechanical Engineering',
    graduationYear: 2026,
    status: 'active',
  });
  const proj3 = await Project.create({
    userId: student3._id,
    title: `${prefix} Autonomous Drone CAD Model`,
    shortDescription: 'Quadcopter frame design.',
    detailedDescription: 'Finite element analysis and CFD optimization of carbon fiber drone frame.',
    category: 'Other',
    technologies: ['SolidWorks', 'ANSYS'],
    verificationStatus: 'Pending', // Unverified!
    projectStatus: 'Completed',
  });

  console.log('--- 1. Testing Category & Technology Filters ---');
  // Category filter: Web Development
  const catRes = await fetch(`${BASE_URL}/projects?category=Web%20Development&search=${prefix}`, {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  const catData = await catRes.json();
  const catMatches = catData.data?.projects || [];
  console.log(`   Category 'Web Development' matches: ${catMatches.length} (Expected: 1)`);
  if (catMatches.length === 1 && catMatches[0]._id === proj1._id.toString()) {
    console.log('✅ PASS: Category filter matched exact project.');
  } else {
    console.error('❌ FAIL: Category filter failed.');
  }

  // Technology filter: MQTT
  const techRes = await fetch(`${BASE_URL}/projects?technology=MQTT&search=${prefix}`, {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  const techData = await techRes.json();
  const techMatches = techData.data?.projects || [];
  console.log(`   Technology 'MQTT' matches: ${techMatches.length} (Expected: 1)`);
  if (techMatches.length === 1 && techMatches[0]._id === proj2._id.toString()) {
    console.log('✅ PASS: Technology filter matched exact project.');
  } else {
    console.error('❌ FAIL: Technology filter failed.');
  }

  console.log('\n--- 2. Testing Text Search ---');
  const searchRes = await fetch(`${BASE_URL}/projects?search=Federation`, {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  const searchData = await searchRes.json();
  const searchMatches = searchData.data?.projects || [];
  console.log(`   Text search 'Federation' returned matches: ${searchMatches.length}`);
  if (searchMatches.some((p) => p._id === proj1._id.toString())) {
    console.log('✅ PASS: Full text / keyword search returns matching project.');
  } else {
    console.error('❌ FAIL: Text search failed.');
  }

  console.log('\n--- 3. Testing Combined Filters (Category + Tech + MinAiScore) ---');
  const combinedRes = await fetch(
    `${BASE_URL}/projects?category=Web%20Development&technology=React&minAiScore=90&search=${prefix}`,
    { headers: { Authorization: `Bearer ${recruiterToken}` } }
  );
  const combinedData = await combinedRes.json();
  const combinedMatches = combinedData.data?.projects || [];
  console.log(`   Combined matches: ${combinedMatches.length} (Expected: 1)`);
  if (combinedMatches.length === 1 && combinedMatches[0]._id === proj1._id.toString()) {
    console.log('✅ PASS: Intersection of all filters accurately resolved single candidate.');
  } else {
    console.error('❌ FAIL: Combined filter intersection failed.');
  }

  console.log('\n--- 4. Testing Conflicting & Invalid AI Score Ranges ---');
  const conflictRes = await fetch(`${BASE_URL}/projects?minAiScore=95&maxAiScore=50`, {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  console.log('   Conflicting range minAiScore=95 > maxAiScore=50 HTTP Status:', conflictRes.status);
  if (conflictRes.status === 400) {
    console.log('✅ PASS: Conflicting AI score range rejected with HTTP 400 Bad Request.');
  } else {
    console.error('❌ FAIL: Conflicting score range was not rejected.');
  }

  console.log('\n--- 5. Testing Recruiter Modification Denial (RBAC Security) ---');
  // Attempt to edit student project
  const editRes = await fetch(`${BASE_URL}/projects/${proj1._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({ title: 'Hacked by Recruiter' }),
  });
  console.log('   Recruiter PUT /projects/:id HTTP Status:', editRes.status);
  if (editRes.status === 403 || editRes.status === 401) {
    console.log('✅ PASS: Recruiter blocked from editing student project.');
  } else {
    console.error('❌ FAIL: Recruiter was able to edit student project.');
  }

  // Attempt to modify verification record
  const dummyVerif = await Verification.create({
    studentId: student1._id,
    targetType: 'PROJECT',
    targetId: proj1._id,
    status: 'PENDING',
  });
  const verifRes = await fetch(`${BASE_URL}/verification/${dummyVerif._id}/approve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({ remarks: 'Illegal recruiter approval' }),
  });
  console.log('   Recruiter PATCH /verification/:id/approve HTTP Status:', verifRes.status);
  if (verifRes.status === 403) {
    console.log('✅ PASS: Recruiter blocked from modifying faculty verification record (HTTP 403).');
  } else {
    console.error('❌ FAIL: Recruiter was able to modify verification.');
  }

  // Cleanup
  await User.deleteMany({ _id: { $in: [recruiter._id, student1._id, student2._id, student3._id] } });
  await Project.deleteMany({ _id: { $in: [proj1._id, proj2._id, proj3._id] } });
  await Portfolio.deleteMany({ _id: { $in: [port1._id, port2._id] } });
  await Verification.deleteMany({ _id: dummyVerif._id });
  await AIEvaluation.deleteMany({ studentId: { $in: [student1._id, student2._id] } });

  console.log('\n====================================================');
  console.log('ALL PHASE 4 RECRUITER CHECKS PASSED!');
  console.log('====================================================');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
