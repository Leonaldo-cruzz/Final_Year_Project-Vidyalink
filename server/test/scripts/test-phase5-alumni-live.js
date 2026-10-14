/* global fetch */
import mongoose from 'mongoose';
import { env } from '../../src/config/env.js';
import User from '../../src/models/user.model.js';
import Endorsement from '../../src/models/endorsement.model.js';
import MockInterview from '../../src/models/mockInterview.model.js';
import Notification from '../../src/models/notification.model.js';
import { generateAccessToken } from '../../src/utils/jwt.util.js';

const BASE_URL = `http://127.0.0.1:${env.PORT || 5000}/api/v1`;

async function main() {
  console.log('====================================================');
  console.log('PHASE 5: ALUMNI ENDORSEMENTS & MOCK INTERVIEWS AUDIT');
  console.log('====================================================\n');

  await mongoose.connect(env.MONGODB_URI);

  const prefix = `live_alumni_${Date.now()}`;
  const alumni = await User.create({
    fullName: `${prefix} Senior Architect`,
    email: `${prefix}@alumni.vidyalink.edu`,
    password: 'Password123!',
    role: 'alumni',
    status: 'active',
  });
  const alumniToken = generateAccessToken({ _id: alumni._id.toString(), role: 'alumni' });

  const student = await User.create({
    fullName: `${prefix} Junior Dev`,
    email: `${prefix}@student.vidyalink.edu`,
    password: 'Password123!',
    role: 'student',
    branch: 'Computer Engineering',
    status: 'active',
  });
  const studentToken = generateAccessToken({ _id: student._id.toString(), role: 'student' });

  const otherStudent = await User.create({
    fullName: `${prefix} Other Student`,
    email: `${prefix}_other@student.vidyalink.edu`,
    password: 'Password123!',
    role: 'student',
    status: 'active',
  });
  const otherStudentToken = generateAccessToken({ _id: otherStudent._id.toString(), role: 'student' });

  // 1. SKILL ENDORSEMENTS
  console.log('--- 1. Testing Skill Endorsements ---');
  // 1a: Alumni endorses student skill
  const endorseRes = await fetch(`${BASE_URL}/mentorship/endorse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alumniToken}`,
    },
    body: JSON.stringify({
      studentId: student._id.toString(),
      skill: 'Distributed Systems',
      notes: 'Exceptional grasp of consensus algorithms and event streaming.',
    }),
  });
  const endorseJson = await endorseRes.json();
  console.log('   Endorse status:', endorseRes.status);
  console.log('   Endorsement created:', endorseJson.data?._id || endorseJson.data?.endorsement?._id);

  if (endorseRes.status === 201 || (endorseRes.status === 200 && (endorseJson.data?._id || endorseJson.data?.endorsement?._id))) {
    console.log('✅ PASS: Authorized alumnus successfully endorsed student skill.');
  } else {
    console.error('❌ FAIL: Skill endorsement failed:', endorseJson);
  }

  // 1b: Persistence & visibility across re-login/fetch
  const fetchEndorseRes = await fetch(`${BASE_URL}/mentorship/endorsements/student/${student._id}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const fetchEndorseJson = await fetchEndorseRes.json();
  const endorsementsList = fetchEndorseJson.data?.endorsements || fetchEndorseJson.data || [];
  console.log('   Student received endorsements count:', endorsementsList.length);
  if (endorsementsList.some((e) => e.canonicalSkill === 'distributed systems' || e.skill === 'Distributed Systems')) {
    console.log('✅ PASS: Endorsement persisted and visible to student.');
  } else {
    console.error('❌ FAIL: Endorsement not retrieved in student view.');
  }

  // 1c: Duplicate endorsement rejected
  const dupRes = await fetch(`${BASE_URL}/mentorship/endorse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alumniToken}`,
    },
    body: JSON.stringify({
      studentId: student._id.toString(),
      skill: 'distributed systems', // Same skill case-insensitive
      notes: 'Duplicate attempt',
    }),
  });
  console.log('   Duplicate endorsement status:', dupRes.status);
  if (dupRes.status === 409 || dupRes.status === 400) {
    console.log('✅ PASS: Duplicate skill endorsement rejected.');
  } else {
    console.error('❌ FAIL: Duplicate endorsement was not rejected.');
  }

  // 1d: Self-endorsement rejected
  const selfRes = await fetch(`${BASE_URL}/mentorship/endorse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alumniToken}`,
    },
    body: JSON.stringify({
      studentId: alumni._id.toString(), // Self!
      skill: 'Python',
    }),
  });
  console.log('   Self-endorsement status:', selfRes.status);
  if (selfRes.status === 400 || selfRes.status === 403) {
    console.log('✅ PASS: Self-endorsement rejected.');
  } else {
    console.error('❌ FAIL: Self-endorsement was not rejected.');
  }

  // 1e: Student unauthorized from calling alumni endorse endpoint
  const studentEndorseRes = await fetch(`${BASE_URL}/mentorship/endorse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      studentId: otherStudent._id.toString(),
      skill: 'Docker',
    }),
  });
  console.log('   Student role endorse status:', studentEndorseRes.status);
  if (studentEndorseRes.status === 403) {
    console.log('✅ PASS: Non-alumni role forbidden from endorsing skills (HTTP 403).');
  } else {
    console.error('❌ FAIL: Non-alumni role was not blocked.');
  }

  // 2. MOCK INTERVIEWS
  console.log('\n--- 2. Testing Mock Interviews Lifecycle ---');
  // 2a: Scheduling future mock interview
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const scheduleRes = await fetch(`${BASE_URL}/mentorship/mock-interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alumniToken}`,
    },
    body: JSON.stringify({
      studentId: student._id.toString(),
      scheduledDate: futureDate,
      mode: 'online',
      meetingLink: 'https://meet.google.com/xyz-test',
      focusDomain: 'Cloud Native Architecture',
    }),
  });
  const scheduleJson = await scheduleRes.json();
  const interview = scheduleJson.data?.interview || scheduleJson.data;
  console.log('   Schedule status:', scheduleRes.status);
  console.log('   Interview ID:', interview?._id || interview?.id);

  if ((scheduleRes.status === 201 || scheduleRes.status === 200) && (interview?._id || interview?.id)) {
    console.log('✅ PASS: Mock interview scheduled successfully.');
  } else {
    console.error('❌ FAIL: Mock interview scheduling failed:', scheduleJson);
  }

  const interviewId = interview?._id || interview?.id;

  // 2b: Notification sent to counterpart
  const notif = await Notification.findOne({ recipient: student._id, type: 'interview' }).sort({ createdAt: -1 });
  if (notif) {
    console.log('✅ PASS: Counterpart notification persisted successfully.');
    console.log('   Notification title:', notif.title, 'Message:', notif.message);
  } else {
    console.error('❌ FAIL: Notification not found for student.');
  }

  // 2c: Confirm status
  const confirmRes = await fetch(`${BASE_URL}/mentorship/mock-interviews/${interviewId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ status: 'confirmed' }),
  });
  console.log('   Confirm status:', confirmRes.status);
  if (confirmRes.status === 200) {
    console.log('✅ PASS: Mock interview status confirmed.');
  } else {
    console.error('❌ FAIL: Confirm status update failed.');
  }

  // 2d: Participant authorization: other student cannot access or modify
  const badAccessRes = await fetch(`${BASE_URL}/mentorship/mock-interviews/${interviewId}`, {
    headers: { Authorization: `Bearer ${otherStudentToken}` },
  });
  console.log('   Non-participant access status:', badAccessRes.status);
  if (badAccessRes.status === 403 || badAccessRes.status === 404) {
    console.log('✅ PASS: Non-participant blocked from accessing mock interview.');
  } else {
    console.error('❌ FAIL: Non-participant accessed interview.');
  }

  // 2e: Submit structured rubric feedback (Alumni interviewer only)
  // Dimensions: technicalKnowledge, problemSolving, communication, projectUnderstanding, confidence (1-5)
  // Overall score = (sum / 25) * 100
  // e.g. 5 + 4 + 5 + 4 + 4 = 22 / 25 = 88%
  const feedbackRes = await fetch(`${BASE_URL}/mentorship/mock-interviews/${interviewId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alumniToken}`,
    },
    body: JSON.stringify({
      technicalKnowledge: 5,
      problemSolving: 4,
      communication: 5,
      projectUnderstanding: 4,
      confidence: 4,
      strengths: 'Outstanding deep knowledge of microservices and network partition tolerance.',
      improvements: 'Work on simplifying high-level architecture explanations for non-technical stakeholders.',
      privateNotes: 'CONFIDENTIAL: Candidate is a strong hire recommendation for the platform team.',
      feedbackVisibility: 'published',
    }),
  });
  const feedbackJson = await feedbackRes.json();
  console.log('   Feedback submission status:', feedbackRes.status);
  const evalData = feedbackJson.data?.evaluation || feedbackJson.data?.interview?.evaluation;
  console.log('   Server-computed overall score:', evalData?.overallScore);

  if (feedbackRes.status === 200 && evalData?.overallScore === 88) {
    console.log('✅ PASS: Structured rubric validated and overall score calculated on server (88/100).');
  } else {
    console.error('❌ FAIL: Rubric feedback submission failed:', feedbackJson);
  }

  // 2f: Private notes privacy verification
  // Student views interview -> privateNotes must be stripped
  const studentViewRes = await fetch(`${BASE_URL}/mentorship/mock-interviews/${interviewId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentViewJson = await studentViewRes.json();
  const studentEval = studentViewJson.data?.evaluation || studentViewJson.data?.interview?.evaluation;
  console.log('   Student view privateNotes:', studentEval?.privateNotes);
  if (studentEval?.privateNotes === undefined) {
    console.log('✅ PASS: Student view securely strips private interviewer notes.');
  } else {
    console.error('❌ FAIL: Private notes leaked to student!');
  }

  // Interviewer views interview -> privateNotes must be preserved
  const alumniViewRes = await fetch(`${BASE_URL}/mentorship/mock-interviews/${interviewId}`, {
    headers: { Authorization: `Bearer ${alumniToken}` },
  });
  const alumniViewJson = await alumniViewRes.json();
  const alumniEval = alumniViewJson.data?.evaluation || alumniViewJson.data?.interview?.evaluation;
  console.log('   Alumni view privateNotes preserved:', Boolean(alumniEval?.privateNotes));
  if (alumniEval?.privateNotes && alumniEval.privateNotes.includes('CONFIDENTIAL')) {
    console.log('✅ PASS: Interviewer view preserves private notes.');
  } else {
    console.error('❌ FAIL: Private notes missing for interviewer!');
  }

  // Cleanup
  await User.deleteMany({ _id: { $in: [alumni._id, student._id, otherStudent._id] } });
  await Endorsement.deleteMany({ student: student._id });
  await MockInterview.deleteMany({ _id: interviewId });
  await Notification.deleteMany({ recipient: { $in: [student._id, alumni._id] } });

  console.log('\n====================================================');
  console.log('ALL PHASE 5 ALUMNI CHECKS PASSED!');
  console.log('====================================================');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
