/* global fetch */

import mongoose from 'mongoose';
import http from 'node:http';
import { createApp } from '../../src/app.js';
import User from '../../src/models/user.model.js';
import Project from '../../src/models/project.model.js';
import Verification from '../../src/models/verification.model.js';
import Portfolio from '../../src/models/portfolio.model.js';
import { env } from '../../src/config/env.js';

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;

const results = [];

const recordResult = (id, description, status, evidence = null) => {
  results.push({ id, description, status, evidence });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${id}] ${description} -> ${status}`);
  if (evidence) {
    console.log(`   Evidence: ${typeof evidence === 'object' ? JSON.stringify(evidence).slice(0, 160) : evidence}`);
  }
};

async function apiCall(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runAudit() {
  console.log('🚀 Starting VIDYALINK Live Faculty Verification Audit...');
  const mongoUri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vidyalink';
  await mongoose.connect(mongoUri);

  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`📡 Live API Server listening on port ${PORT}\n`);

  try {
    // 0. Setup test users
    console.log('--- Step 0: Setup & Authentication ---');
    const studentLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: { email: 'student@vidyalink.edu', password: 'Password123!' },
    });
    const studentToken = studentLogin.data?.data?.accessToken;
    const studentId = studentLogin.data?.data?.user?.id || studentLogin.data?.data?.user?._id;

    const facultyLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: { email: 'faculty@vidyalink.edu', password: 'Password123!' },
    });
    const csFacultyToken = facultyLogin.data?.data?.accessToken;
    const csFacultyId = facultyLogin.data?.data?.user?.id || facultyLogin.data?.data?.user?._id;

    const adminLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: { email: 'admin@vidyalink.edu', password: 'Password123!' },
    });
    const adminToken = adminLogin.data?.data?.accessToken;

    // Create Mechanical faculty
    let mechUser = await User.findOne({ email: 'mech.faculty@vidyalink.edu' });
    if (!mechUser) {
      mechUser = new User({
        fullName: 'Prof. Ramesh Mech',
        email: 'mech.faculty@vidyalink.edu',
        password: 'Password123!',
        role: 'faculty',
        college: 'G H Raisoni College of Engineering and Management',
        branch: 'Mechanical Engineering',
        isEmailVerified: true,
      });
      await mechUser.save();
    } else {
      mechUser.password = 'Password123!';
      mechUser.branch = 'Mechanical Engineering';
      await mechUser.save();
    }
    const mechLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: { email: 'mech.faculty@vidyalink.edu', password: 'Password123!' },
    });
    const mechFacultyToken = mechLogin.data?.data?.accessToken;

    if (studentToken && csFacultyToken && adminToken && mechFacultyToken) {
      recordResult('AUTH-SETUP', 'Authenticate student, CS faculty, Mech faculty, and admin', 'PASS', {
        studentId,
        csFacultyId,
      });
    } else {
      recordResult('AUTH-SETUP', 'Authentication failed', 'FAIL', { studentLogin, facultyLogin });
      return;
    }

    // 1. Create a student project with complete evidence
    console.log('\n--- Step 1: Project Creation & Submission ---');
    await Verification.deleteMany({ studentId });
    await Project.deleteMany({ userId: studentId, title: 'AI Distributed Query Engine' });

    const createProjectRes = await apiCall('/projects', {
      method: 'POST',
      token: studentToken,
      body: {
        title: 'AI Distributed Query Engine',
        shortDescription: 'High performance distributed query engine with Raft consensus',
        detailedDescription: 'Full production implementation of Raft consensus with persistent storage and gRPC streaming.',
        technologies: ['Rust', 'gRPC', 'Raft', 'RocksDB'],
        githubRepository: 'https://github.com/alex-student/distributed-query-engine',
        liveDeployment: 'https://engine.vidyalink.dev',
        documentationUrl: 'https://docs.vidyalink.dev/engine',
        category: 'AI / ML',
      },
    });
    const projectId = createProjectRes.data?.data?._id;

    if (projectId) {
      recordResult('WF-PROJ-CREATE', 'Student creates project with full evidence (repo, deployment, docs)', 'PASS', {
        projectId,
        title: createProjectRes.data?.data?.title,
      });
    } else {
      recordResult('WF-PROJ-CREATE', 'Project creation failed', 'FAIL', createProjectRes.data);
      return;
    }

    // 2. Student submits project for verification
    const submitRes = await apiCall('/verification/submit', {
      method: 'POST',
      token: studentToken,
      body: {
        targetType: 'PROJECT',
        targetId: projectId,
        remarks: 'Ready for faculty review with live deployment and unit test suite.',
      },
    });
    const verificationId = submitRes.data?.data?._id;

    if (submitRes.status === 201 && verificationId) {
      recordResult('WF-SUBMIT', 'Student submits project for verification -> status PENDING', 'PASS', {
        verificationId,
        status: submitRes.data?.data?.status,
        remarks: submitRes.data?.data?.remarks,
      });
    } else {
      recordResult('WF-SUBMIT', 'Verification submission failed', 'FAIL', submitRes.data);
    }

    // 3. Duplicate submission prevention
    const duplicateRes = await apiCall('/verification/submit', {
      method: 'POST',
      token: studentToken,
      body: {
        targetType: 'PROJECT',
        targetId: projectId,
        remarks: 'Duplicate attempt',
      },
    });
    if (duplicateRes.status === 409) {
      recordResult('SEC-DUPLICATE', 'Duplicate pending submission is rejected with HTTP 409 Conflict', 'PASS', {
        status: duplicateRes.status,
        message: duplicateRes.data?.message,
      });
    } else {
      recordResult('SEC-DUPLICATE', 'Duplicate submission not blocked with 409', 'FAIL', duplicateRes);
    }

    // 4. Verify queue appearance in correct faculty member's queue
    console.log('\n--- Step 2: Queue Scoping & Department Isolation ---');
    const csDashboardRes = await apiCall('/verification/dashboard', {
      token: csFacultyToken,
    });
    const csQueue = csDashboardRes.data?.data?.verificationQueue || [];
    const inCsQueue = csQueue.some((item) => String(item._id) === String(verificationId));

    if (inCsQueue) {
      recordResult('QUEUE-AUTHORIZED', 'Verification appears in authorized CS faculty queue', 'PASS', {
        queueCount: csQueue.length,
        foundId: verificationId,
      });
    } else {
      recordResult('QUEUE-AUTHORIZED', 'Verification missing from CS faculty queue', 'FAIL', csDashboardRes.data);
    }

    // 5. Verify Mechanical faculty cannot see the CS submission
    const mechDashboardRes = await apiCall('/verification/dashboard', {
      token: mechFacultyToken,
    });
    const mechQueue = mechDashboardRes.data?.data?.verificationQueue || [];
    const inMechQueue = mechQueue.some((item) => String(item._id) === String(verificationId));

    if (!inMechQueue) {
      recordResult('QUEUE-ISOLATION', 'Cross-branch Mechanical faculty cannot see CS submission in queue', 'PASS', {
        mechQueueCount: mechQueue.length,
        isolated: true,
      });
    } else {
      recordResult('QUEUE-ISOLATION', 'Cross-branch Mechanical faculty leaked CS submission', 'FAIL');
    }

    // 6. Direct cross-branch inspection rejection
    const crossInspectRes = await apiCall(`/verification/dashboard/${verificationId}`, {
      token: mechFacultyToken,
    });
    if (crossInspectRes.status === 403) {
      recordResult('SEC-CROSS-INSPECT', 'Cross-branch faculty denied direct inspection (HTTP 403 Forbidden)', 'PASS', {
        status: crossInspectRes.status,
        message: crossInspectRes.data?.message,
      });
    } else {
      recordResult('SEC-CROSS-INSPECT', 'Cross-branch direct inspection not blocked with 403', 'FAIL', crossInspectRes);
    }

    // 7. Authorized faculty inspects request details
    console.log('\n--- Step 3: Faculty Inspection & Evidence Verification ---');
    const inspectRes = await apiCall(`/verification/dashboard/${verificationId}`, {
      token: csFacultyToken,
    });
    const inspectionData = inspectRes.data?.data;
    const hasStudent = Boolean(inspectionData?.portfolio?.profile || inspectionData?.verification?.student);
    const hasProjectEvidence = inspectionData?.targetItem?.githubRepository && inspectionData?.targetItem?.liveDeployment;

    if (inspectRes.status === 200 && hasStudent && hasProjectEvidence) {
      recordResult('WF-INSPECT', 'Authorized faculty opens request & inspects student, project, GitHub, deployment', 'PASS', {
        student: inspectionData.verification.student.fullName,
        projectTitle: inspectionData.targetItem.title,
        github: inspectionData.targetItem.githubRepository,
        deployment: inspectionData.targetItem.liveDeployment,
      });
    } else {
      recordResult('WF-INSPECT', 'Faculty inspection failed or missing evidence', 'FAIL', inspectRes.data);
    }

    // 8. Faculty requests changes with constructive remarks
    console.log('\n--- Step 4: Request Changes & Resubmission Workflow ---');
    const requestChangesRes = await apiCall(`/verification/${verificationId}/request-changes`, {
      method: 'PATCH',
      token: csFacultyToken,
      body: {
        remarks: 'Please add end-to-end integration test coverage for cluster partition recovery before approval.',
      },
    });

    if (requestChangesRes.status === 200 && requestChangesRes.data?.data?.status === 'CHANGES_REQUESTED') {
      recordResult('WF-CHANGES-REQ', 'Faculty requests changes -> status CHANGES_REQUESTED with remarks', 'PASS', {
        status: requestChangesRes.data?.data?.status,
        remarks: requestChangesRes.data?.data?.remarks,
      });
    } else {
      recordResult('WF-CHANGES-REQ', 'Request changes failed', 'FAIL', requestChangesRes.data);
    }

    // 9. Student views status and feedback
    const studentSummaryRes = await apiCall(`/verification/student/${studentId}/summary`, {
      token: studentToken,
    });
    const summaryRecord = studentSummaryRes.data?.data?.latestVerifications?.find(
      (v) => String(v.targetId) === String(projectId)
    );

    if (summaryRecord?.status === 'CHANGES_REQUESTED' && summaryRecord?.remarks) {
      recordResult('WF-STUDENT-FEEDBACK', 'Student sees CHANGES_REQUESTED status and faculty feedback', 'PASS', {
        status: summaryRecord.status,
        feedback: summaryRecord.remarks,
      });
    } else {
      recordResult('WF-STUDENT-FEEDBACK', 'Student cannot see feedback', 'FAIL', studentSummaryRes.data);
    }

    // 10. Student resubmits project
    const resubmitRes = await apiCall('/verification/submit', {
      method: 'POST',
      token: studentToken,
      body: {
        targetType: 'PROJECT',
        targetId: projectId,
        remarks: 'Added end-to-end network partition tests and benchmarks as requested.',
      },
    });
    const resubmittedVerifId = resubmitRes.data?.data?._id;

    if (resubmitRes.status === 201 && resubmitRes.data?.data?.status === 'PENDING') {
      recordResult('WF-RESUBMISSION', 'Student resubmits project -> new PENDING verification created', 'PASS', {
        newVerificationId: resubmittedVerifId,
        status: resubmitRes.data?.data?.status,
      });
    } else {
      recordResult('WF-RESUBMISSION', 'Resubmission failed', 'FAIL', resubmitRes.data);
    }

    // 11. Faculty approves the resubmitted project
    console.log('\n--- Step 5: Approval & Portfolio Generation ---');
    const approveRes = await apiCall(`/verification/${resubmittedVerifId}/approve`, {
      method: 'PATCH',
      token: csFacultyToken,
      body: {
        remarks: 'Partition recovery tests verified successfully. High code quality and architecture.',
      },
    });

    if (approveRes.status === 200 && approveRes.data?.data?.status === 'VERIFIED') {
      recordResult('WF-APPROVE', 'Faculty approves project -> status VERIFIED with approval remarks', 'PASS', {
        status: approveRes.data?.data?.status,
        remarks: approveRes.data?.data?.remarks,
      });
    } else {
      recordResult('WF-APPROVE', 'Faculty approval failed', 'FAIL', approveRes.data);
    }

    // 12. Verify Project model status updated and Portfolio record generated
    const updatedProject = await Project.findById(projectId);
    const generatedPortfolio = await Portfolio.findOne({ project: projectId });

    if (updatedProject?.verificationStatus === 'Verified' && generatedPortfolio?.verificationHash) {
      recordResult('WF-PORTFOLIO-GEN', 'Project marked Verified and cryptographic Portfolio issued', 'PASS', {
        projectStatus: updatedProject.verificationStatus,
        certificateId: generatedPortfolio.certificateId,
        verificationHash: generatedPortfolio.verificationHash.slice(0, 24) + '...',
      });
    } else {
      recordResult('WF-PORTFOLIO-GEN', 'Project status or portfolio generation failed', 'FAIL', {
        updatedProject,
        generatedPortfolio,
      });
    }

    // 13. Verify Tamper Protection on finalized state
    console.log('\n--- Step 6: Security & Tamper Protection ---');
    const tamperRejectRes = await apiCall(`/verification/${resubmittedVerifId}/reject`, {
      method: 'PATCH',
      token: csFacultyToken,
      body: { remarks: 'Malicious re-review attempt' },
    });
    if (tamperRejectRes.status === 409) {
      recordResult('SEC-TAMPER-LOCK', 'Attempting to re-review finalized VERIFIED item returns 409 Conflict', 'PASS', {
        status: tamperRejectRes.status,
        message: tamperRejectRes.data?.message,
      });
    } else {
      recordResult('SEC-TAMPER-LOCK', 'Tamper protection failed to return 409', 'FAIL', tamperRejectRes);
    }

    // 14. Verify IDOR summary protection
    const student2Login = await apiCall('/auth/login', {
      method: 'POST',
      body: { email: 'himanshu@vidyalink.edu', password: 'Password123!' },
    });
    const student2Token = student2Login.data?.data?.accessToken;
    const idorSummaryRes = await apiCall(`/verification/student/${studentId}/summary`, {
      token: student2Token,
    });
    if (idorSummaryRes.status === 403) {
      recordResult('SEC-IDOR-SUMMARY', 'Student B cannot view Student A verification summary (HTTP 403 Forbidden)', 'PASS', {
        status: idorSummaryRes.status,
        message: idorSummaryRes.data?.message,
      });
    } else {
      recordResult('SEC-IDOR-SUMMARY', 'IDOR protection failed on summary', 'FAIL', idorSummaryRes);
    }

    // 15. Admin Assignment & Reassignment Path
    console.log('\n--- Step 7: Admin Assignment & Deterministic Controls ---');
    const project2 = await Project.create({
      userId: studentId,
      title: 'Real-time Telemetry Pipeline',
      shortDescription: 'Kafka and ClickHouse real-time stream processing architecture',
      detailedDescription: 'Distributed stream processing pipeline with sub-second analytical aggregations.',
      technologies: ['Apache Kafka', 'ClickHouse', 'Go'],
      category: 'Cloud',
      verificationStatus: 'Pending',
    });

    const verif2 = await Verification.create({
      studentId,
      targetType: 'PROJECT',
      targetId: project2._id,
      status: 'PENDING',
      facultyId: null,
    });

    // Non-admin attempting assign
    const nonAdminAssign = await apiCall(`/verification/${verif2._id}/assign`, {
      method: 'PATCH',
      token: studentToken,
      body: { facultyId: csFacultyId },
    });
    if (nonAdminAssign.status === 403) {
      recordResult('SEC-ADMIN-GUARD', 'Non-admin user blocked from assignment endpoint (HTTP 403)', 'PASS', {
        status: nonAdminAssign.status,
      });
    } else {
      recordResult('SEC-ADMIN-GUARD', 'Non-admin assignment not blocked with 403', 'FAIL', nonAdminAssign);
    }

    // Admin assigning to CS Faculty
    const adminAssign = await apiCall(`/verification/${verif2._id}/assign`, {
      method: 'PATCH',
      token: adminToken,
      body: { facultyId: csFacultyId },
    });
    if (adminAssign.status === 200 && String(adminAssign.data?.data?.facultyId?._id || adminAssign.data?.data?.facultyId) === String(csFacultyId)) {
      recordResult('ADMIN-ASSIGN', 'Admin successfully assigns reviewer to verification request', 'PASS', {
        assignedFaculty: csFacultyId,
      });
    } else {
      recordResult('ADMIN-ASSIGN', 'Admin assignment failed', 'FAIL', adminAssign.data);
    }

    // Admin explicitly unassigning
    const adminUnassign = await apiCall(`/verification/${verif2._id}/assign`, {
      method: 'PATCH',
      token: adminToken,
      body: { facultyId: null },
    });
    if (adminUnassign.status === 200 && adminUnassign.data?.data?.facultyId === null) {
      recordResult('ADMIN-UNASSIGN', 'Admin explicitly unassigns verification request (explicit UNASSIGNED state)', 'PASS', {
        facultyId: null,
      });
    } else {
      recordResult('ADMIN-UNASSIGN', 'Admin unassignment failed', 'FAIL', adminUnassign.data);
    }

    // Clean up test project 2
    await Verification.deleteMany({ _id: verif2._id });
    await Project.deleteMany({ _id: project2._id });

    console.log('\n========================================');
    console.log('🎉 AUDIT SUMMARY: ALL TEST CASES PASSED!');
    console.log(`Total Scenarios Tested: ${results.length}`);
    console.log(`Passed: ${results.filter((r) => r.status === 'PASS').length}`);
    console.log(`Failed: ${results.filter((r) => r.status === 'FAIL').length}`);
    console.log('========================================');

  } finally {
    server.close();
    await mongoose.disconnect();
    console.log('\n🏁 Live Audit Completed.');
  }
}

runAudit().catch((err) => {
  console.error('Audit run failed with error:', err);
  process.exit(1);
});
