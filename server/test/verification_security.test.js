import assert from 'node:assert/strict';
import test from 'node:test';

process.env.JWT_SECRET ||= 'test-jwt-secret-test-jwt-secret-test';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-test-refresh-secret';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/vidyalink-test';

const verificationService = (await import('../src/services/verification.service.js')).default;
const verificationController = (await import('../src/controllers/verification.controller.js')).default;
const authenticate = (await import('../src/middleware/auth.middleware.js')).default;
const authorize = (await import('../src/middleware/role.middleware.js')).default;
const {
  submitVerificationSchema,
  approveVerificationSchema,
  rejectVerificationSchema,
  requestChangesVerificationSchema,
  facultyVerificationDashboardSchema,
  facultyVerificationDetailSchema,
  studentSummarySchema,
  verificationStatusSchema,
  verificationHistorySchema,
  assignVerificationSchema,
} = await import('../src/validators/verification.validator.js');
const Verification = (await import('../src/models/verification.model.js')).default;
const Project = (await import('../src/models/project.model.js')).default;
const Certificate = (await import('../src/models/certificate.model.js')).default;
const Profile = (await import('../src/models/profile.model.js')).default;
const User = (await import('../src/models/user.model.js')).default;
const ApiError = (await import('../src/utils/ApiError.js')).default;

const invokeHandler = (handler, req, res = {}) => {
  return new Promise((resolve, reject) => {
    let settled = false;
    const next = (err) => {
      if (settled) return;
      settled = true;
      if (err) return reject(err);
      return resolve();
    };

    try {
      const p = handler(req, res, next);
      if (p && typeof p.then === 'function') {
        p.catch((err) => {
          if (!settled) {
            settled = true;
            reject(err);
          }
        });
      }
    } catch (err) {
      if (!settled) {
        settled = true;
        reject(err);
      }
    }
  });
};

// ─── PART 1: AUTHENTICATION TESTS ──────────────────────────────────────────────

test('SEC-AUTH-1: Unauthenticated request missing Authorization header throws HTTP 401', async () => {
  const req = { headers: {} };

  await assert.rejects(
    async () => {
      await invokeHandler(authenticate, req);
    },
    (err) => {
      assert.equal(err.statusCode, 401);
      assert.match(err.message, /access token is required/i);
      return true;
    }
  );
});

test('SEC-AUTH-2: Request with malformed Authorization header throws HTTP 401', async () => {
  const req = { headers: { authorization: 'Basic some-base64-string' } };

  await assert.rejects(
    async () => {
      await invokeHandler(authenticate, req);
    },
    (err) => {
      assert.equal(err.statusCode, 401);
      assert.match(err.message, /bearer <token> format/i);
      return true;
    }
  );
});

test('SEC-AUTH-3: Request with invalid or expired JWT throws HTTP 401', async () => {
  const req = { headers: { authorization: 'Bearer invalid.token.value' } };

  await assert.rejects(
    async () => {
      await invokeHandler(authenticate, req);
    },
    (err) => {
      assert.equal(err.statusCode, 401);
      return true;
    }
  );
});

// ─── PART 2: AUTHORIZATION & ROLE GATING TESTS ────────────────────────────────

test('SEC-ROLE-1: Student attempting faculty/admin verification actions is rejected with HTTP 403', () => {
  const facultyAuth = authorize('faculty', 'admin');

  assert.throws(
    () => facultyAuth({ user: { role: 'student', _id: 'student-1' } }, {}, () => {}),
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /access denied/i);
      return true;
    }
  );
});

test('SEC-ROLE-2: Recruiter or alumnus attempting faculty verification queue is rejected with HTTP 403', () => {
  const facultyAuth = authorize('faculty', 'admin');

  // Recruiter
  assert.throws(
    () => facultyAuth({ user: { role: 'recruiter', _id: 'recruiter-1' } }, {}, () => {}),
    (err) => {
      assert.equal(err.statusCode, 403);
      return true;
    }
  );

  // Alumnus
  assert.throws(
    () => facultyAuth({ user: { role: 'alumni', _id: 'alumni-1' } }, {}, () => {}),
    (err) => {
      assert.equal(err.statusCode, 403);
      return true;
    }
  );
});

test('SEC-ROLE-3: Unauthorized non-admin user attempting admin verification controls receives HTTP 403', () => {
  const adminAuth = authorize('admin');

  for (const role of ['student', 'faculty', 'recruiter', 'alumni']) {
    assert.throws(
      () => adminAuth({ user: { role, _id: `${role}-1` } }, {}, () => {}),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /access denied/i);
        return true;
      }
    );
  }
});

test('SEC-ROLE-4: Backend service directly rejects non-faculty/admin actors attempting approval/rejection', async () => {
  const origFindById = Verification.findById;
  Verification.findById = async () => ({
    _id: '507f1f77bcf86cd799439011',
    status: 'PENDING',
    studentId: '507f1f77bcf86cd799439012',
  });

  try {
    // Student actor role in service
    await assert.rejects(
      async () => {
        await verificationService.approve('507f1f77bcf86cd799439011', 'student-1', 'student', 'My review');
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /only faculty or administrative supervisors/i);
        return true;
      }
    );

    // Recruiter actor role in service
    await assert.rejects(
      async () => {
        await verificationService.reject('507f1f77bcf86cd799439011', 'recruiter-1', 'recruiter', 'Rejection reason');
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /only faculty or administrative supervisors/i);
        return true;
      }
    );
  } finally {
    Verification.findById = origFindById;
  }
});

test('SEC-ROLE-5: Non-student attempting verification submission is rejected with HTTP 403 in controller', async () => {
  const req = {
    user: { role: 'faculty', _id: 'fac-1' },
    body: { targetType: 'PROJECT', targetId: '507f1f77bcf86cd799439011' },
  };

  await assert.rejects(
    async () => {
      await invokeHandler(verificationController.submit, req);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /only students can submit/i);
      return true;
    }
  );
});

// ─── PART 3: IDOR & OBJECT-LEVEL ACCESS CONTROL ────────────────────────────────

test('SEC-IDOR-1: Student cannot access another student verification summary (HTTP 403)', async () => {
  const studentA = { _id: '507f1f77bcf86cd799439011', role: 'student' };
  const studentBId = '507f1f77bcf86cd799439022';

  // In service
  await assert.rejects(
    async () => {
      await verificationService.getStudentVerificationSummary(studentBId, studentA);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /only authorized to view their own verification summary/i);
      return true;
    }
  );

  // In controller
  const req = {
    user: studentA,
    validated: { params: { studentId: studentBId } },
  };
  await assert.rejects(
    async () => {
      await invokeHandler(verificationController.getStudentVerificationSummary, req);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /only authorized to view their own verification summary/i);
      return true;
    }
  );
});

test('SEC-IDOR-2: Student cannot submit or inspect verification for resource owned by another student (HTTP 404 non-disclosing)', async () => {
  const origProjectExists = Project.exists;
  Project.exists = async (query) => {
    // Only student-alice owns proj-alice
    return query.userId === 'student-alice' && query._id === 'proj-alice';
  };

  try {
    // Student Bob attempts to submit Alice's project
    await assert.rejects(
      async () => {
        await verificationService.createVerification('student-bob', {
          targetType: 'PROJECT',
          targetId: 'proj-alice',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /verification target was not found/i);
        return true;
      }
    );

    // Student Bob attempts to query status of Alice's project
    await assert.rejects(
      async () => {
        await verificationService.getVerificationStatus('student-bob', 'PROJECT', 'proj-alice');
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /verification target was not found/i);
        return true;
      }
    );
  } finally {
    Project.exists = origProjectExists;
  }
});

test('SEC-IDOR-3: Faculty from College A cannot review student from College B (Institution Scoping)', async () => {
  const origFindById = Verification.findById;

  const stanfordFaculty = {
    _id: 'fac-stanford-1',
    role: 'faculty',
    branch: 'Computer Science',
    college: 'Stanford University',
  };

  const mitVerification = {
    _id: 'verif-mit-1',
    studentId: {
      _id: 'student-mit-1',
      fullName: 'MIT Student',
      branch: 'Computer Science',
      college: 'MIT',
    },
    status: 'PENDING',
    targetType: 'PROJECT',
    targetId: '507f1f77bcf86cd799439011',
  };

  Verification.findById = () => mitVerification;

  try {
    await assert.rejects(
      async () => {
        await verificationService.getFacultyVerificationDetail('verif-mit-1', stanfordFaculty);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /outside your institution\/college/i);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await verificationService.approve('verif-mit-1', stanfordFaculty._id, 'faculty', 'Remarks', stanfordFaculty);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /outside your institution\/college/i);
        return true;
      }
    );
  } finally {
    Verification.findById = origFindById;
  }
});

test('SEC-IDOR-4: Faculty A cannot modify request assigned exclusively to Faculty B', async () => {
  const origFindById = Verification.findById;

  const facultyA = {
    _id: '507f1f77bcf86cd7994390aa',
    role: 'faculty',
    branch: 'Computer Science',
    college: 'State University',
  };

  const assignedVerification = {
    _id: '507f1f77bcf86cd799439011',
    facultyId: { _id: '507f1f77bcf86cd7994390bb' }, // assigned to Faculty B
    studentId: {
      _id: '507f1f77bcf86cd7994390cc',
      branch: 'Computer Science',
      college: 'State University',
    },
    status: 'PENDING',
    targetType: 'PROJECT',
    targetId: '507f1f77bcf86cd7994390dd',
  };

  Verification.findById = async () => assignedVerification;

  try {
    await assert.rejects(
      async () => {
        await verificationService.approve(
          '507f1f77bcf86cd799439011',
          facultyA._id,
          'faculty',
          'Attempted overwrite',
          facultyA
        );
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /assigned to another faculty member/i);
        return true;
      }
    );
  } finally {
    Verification.findById = origFindById;
  }
});

// ─── PART 4: INPUT & SCHEMA VALIDATION TESTS ──────────────────────────────────

test('SEC-VAL-1: Malformed MongoDB ObjectIds fail validation with HTTP 400', () => {
  const malformedIds = ['invalid-id', '123', '507f1f77bcf86cd79943901z', '', null];

  for (const id of malformedIds) {
    const res = approveVerificationSchema.safeParse({
      params: { id },
      body: { remarks: 'Valid remarks' },
    });
    assert.equal(res.success, false, `ID "${id}" should fail validation`);
  }
});

test('SEC-VAL-2: Unexpected extra fields in request bodies are rejected with HTTP 400 (strict schema)', () => {
  // Extra fields in submit payload
  const submitWithExtra = submitVerificationSchema.safeParse({
    body: {
      targetType: 'PROJECT',
      targetId: '507f1f77bcf86cd799439011',
      status: 'VERIFIED', // attempting privilege escalation via extra field
      isVerified: true,
    },
  });
  assert.equal(submitWithExtra.success, false, 'Extra fields in submit must be rejected');

  // Extra fields in approve payload
  const approveWithExtra = approveVerificationSchema.safeParse({
    params: { id: '507f1f77bcf86cd799439011' },
    body: {
      remarks: 'Looks good',
      override: true,
    },
  });
  assert.equal(approveWithExtra.success, false, 'Extra fields in approve must be rejected');
});

test('SEC-VAL-3: Empty or whitespace-only remarks on reject and request-changes fail validation', () => {
  for (const badRemarks of ['', '   ', null, undefined]) {
    const rejectRes = rejectVerificationSchema.safeParse({
      params: { id: '507f1f77bcf86cd799439011' },
      body: { remarks: badRemarks },
    });
    assert.equal(rejectRes.success, false, `Remarks "${badRemarks}" must fail for reject`);

    const changesRes = requestChangesVerificationSchema.safeParse({
      params: { id: '507f1f77bcf86cd799439011' },
      body: { remarks: badRemarks },
    });
    assert.equal(changesRes.success, false, `Remarks "${badRemarks}" must fail for request-changes`);
  }
});

test('SEC-VAL-4: Missing required fields fail validation with HTTP 400', () => {
  // Missing targetType
  const missingType = submitVerificationSchema.safeParse({
    body: { targetId: '507f1f77bcf86cd799439011' },
  });
  assert.equal(missingType.success, false);

  // Missing targetId
  const missingId = submitVerificationSchema.safeParse({
    body: { targetType: 'PROJECT' },
  });
  assert.equal(missingId.success, false);
});

test('SEC-VAL-5: Nonexistent verification request returns HTTP 404', async () => {
  const origFindById = Verification.findById;
  Verification.findById = () => null;

  try {
    await assert.rejects(
      async () => {
        await verificationService.getFacultyVerificationDetail('507f1f77bcf86cd799439011', {
          role: 'admin',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /verification request not found/i);
        return true;
      }
    );
  } finally {
    Verification.findById = origFindById;
  }
});

// ─── PART 5: LIFECYCLE & STATE MACHINE TRANSITION SAFETY ───────────────────────

test('SEC-STATE-1: Attempting to approve an already-VERIFIED verification throws HTTP 409 Conflict', async () => {
  const origFindById = Verification.findById;
  const verifiedRecord = {
    _id: '507f1f77bcf86cd799439011',
    status: 'VERIFIED',
    studentId: 'student-123',
    facultyId: 'faculty-456',
  };

  Verification.findById = async () => verifiedRecord;

  try {
    await assert.rejects(
      async () => {
        await verificationService.approve(
          '507f1f77bcf86cd799439011',
          'faculty-456',
          'faculty',
          'Duplicate approval'
        );
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /already been finalized/i);
        return true;
      }
    );
  } finally {
    Verification.findById = origFindById;
  }
});

test('SEC-STATE-2: Attempting to reject an already-REJECTED verification throws HTTP 409 Conflict', async () => {
  const origFindById = Verification.findById;
  const rejectedRecord = {
    _id: '507f1f77bcf86cd799439011',
    status: 'REJECTED',
    studentId: 'student-123',
    facultyId: 'faculty-456',
  };

  Verification.findById = async () => rejectedRecord;

  try {
    await assert.rejects(
      async () => {
        await verificationService.reject(
          '507f1f77bcf86cd799439011',
          'faculty-456',
          'faculty',
          'Duplicate rejection'
        );
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /already been finalized/i);
        return true;
      }
    );
  } finally {
    Verification.findById = origFindById;
  }
});

test('SEC-STATE-3: Attempting to submit verification for an already-verified project is rejected (Conflict)', async () => {
  const origProjectExists = Project.exists;
  const origProjectFindById = Project.findById;

  Project.exists = async () => true;
  Project.findById = async () => ({
    _id: '507f1f77bcf86cd799439011',
    verificationStatus: 'Verified', // already verified project!
    title: 'Verified System',
    shortDescription: 'Valid short description for testing',
    technologies: ['React', 'Node'],
  });

  try {
    await assert.rejects(
      async () => {
        await verificationService.createVerification('student-1', {
          targetType: 'PROJECT',
          targetId: '507f1f77bcf86cd799439011',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /already been verified/i);
        return true;
      }
    );
  } finally {
    Project.exists = origProjectExists;
    Project.findById = origProjectFindById;
  }
});

test('SEC-STATE-4: Student resubmits after CHANGES_REQUESTED -> transitions project back to Pending', async () => {
  const origProjectExists = Project.exists;
  const origProjectFindById = Project.findById;
  const origProjectFindByIdAndUpdate = Project.findByIdAndUpdate;
  const origVerifExists = Verification.exists;
  const origVerifCreate = Verification.create;

  let projectStatusUpdated = null;

  Project.exists = async () => true;
  Project.findById = async () => ({
    _id: 'proj-resubmit',
    verificationStatus: 'Pending',
    title: 'Updated Project System',
    shortDescription: 'Properly updated short description for resubmission',
    technologies: ['TypeScript', 'Express'],
  });
  Project.findByIdAndUpdate = async (id, update) => {
    projectStatusUpdated = { id, update };
    return { _id: id, ...update };
  };
  Verification.exists = async () => false; // no open pending request
  Verification.create = async (doc) => ({ _id: 'verif-new', ...doc });

  try {
    const result = await verificationService.createVerification('student-1', {
      targetType: 'PROJECT',
      targetId: 'proj-resubmit',
      remarks: 'Addressed faculty feedback and added unit tests.',
    });

    assert.equal(result.status, 'PENDING');
    assert.equal(result.remarks, 'Addressed faculty feedback and added unit tests.');
    assert.ok(projectStatusUpdated);
    assert.equal(projectStatusUpdated.update.verificationStatus, 'Pending');
  } finally {
    Project.exists = origProjectExists;
    Project.findById = origProjectFindById;
    Project.findByIdAndUpdate = origProjectFindByIdAndUpdate;
    Verification.exists = origVerifExists;
    Verification.create = origVerifCreate;
  }
});

// ─── PART 6: ASSIGNMENT, MULTI-BRANCH & QUEUE ALLOCATION TESTS ────────────────

test('SEC-ASSIGN-1: Multi-branch faculty member accesses students across multiple assigned branches', async () => {
  const origProfileFind = Profile.find;
  const multiBranchFaculty = {
    _id: 'fac-multi-1',
    role: 'faculty',
    branches: ['Computer Science', 'Information Technology'],
  };

  let queriedBranches = null;
  Profile.find = (filter) => {
    queriedBranches = filter.branch;
    return {
      distinct: async () => ['student-cs-1', 'student-it-1'],
    };
  };

  try {
    const studentIds = await verificationService.getStudentIdsForBranches(multiBranchFaculty.branches, multiBranchFaculty);
    assert.deepEqual(queriedBranches, { $in: ['Computer Science', 'Information Technology'] });
    assert.equal(studentIds.length, 2);
    assert.ok(studentIds.includes('student-cs-1'));
    assert.ok(studentIds.includes('student-it-1'));
  } finally {
    Profile.find = origProfileFind;
  }
});

test('SEC-ASSIGN-2: Deterministic assignment assigns lowest pending workload faculty with stable tie-breaker ID', async () => {
  const origStudentBranch = verificationService.getStudentBranch;
  const origUserFind = User.find;
  const origVerifAggregate = Verification.aggregate;

  verificationService.getStudentBranch = async () => 'Computer Science';

  const facultyA = { _id: '507f1f77bcf86cd799439001', fullName: 'Dr. Alpha', role: 'faculty' };
  const facultyB = { _id: '507f1f77bcf86cd799439002', fullName: 'Dr. Beta', role: 'faculty' };

  User.find = () => ({
    select: () => [facultyB, facultyA], // unsorted order from DB
  });

  // Both have 0 pending items -> stable tie-breaker chooses facultyA (001 before 002)
  Verification.aggregate = async () => [];

  const mongooseModule = (await import('mongoose')).default;
  const origReadyState = mongooseModule.connection.readyState;
  mongooseModule.connection.readyState = 1;

  try {
    const assigned = await verificationService.findEligibleFacultyForStudent('student-1');
    assert.ok(assigned);
    assert.equal(String(assigned._id), String(facultyA._id));
  } finally {
    verificationService.getStudentBranch = origStudentBranch;
    User.find = origUserFind;
    Verification.aggregate = origVerifAggregate;
    mongooseModule.connection.readyState = origReadyState;
  }
});

test('SEC-ASSIGN-3: When no eligible faculty exists, assignmentStatus is UNASSIGNED', async () => {
  const origStudentBranch = verificationService.getStudentBranch;
  const origUserFind = User.find;

  verificationService.getStudentBranch = async () => 'Aerospace Engineering';
  User.find = () => ({ select: () => [] }); // no faculty in this branch

  const mongooseModule = (await import('mongoose')).default;
  const origReadyState = mongooseModule.connection.readyState;
  mongooseModule.connection.readyState = 1;

  try {
    const assigned = await verificationService.findEligibleFacultyForStudent('student-aero');
    assert.equal(assigned, null);

    const queueItem = verificationService.buildFacultyQueueItem(
      { _id: 'verif-aero', studentId: 'student-aero', facultyId: null, createdAt: new Date() },
      null
    );
    assert.equal(queueItem.assignmentStatus, 'UNASSIGNED');
    assert.equal(queueItem.assignedFaculty, null);
  } finally {
    verificationService.getStudentBranch = origStudentBranch;
    User.find = origUserFind;
    mongooseModule.connection.readyState = origReadyState;
  }
});

test('SEC-ASSIGN-4: Admin can assign verification to eligible faculty', async () => {
  const origFindById = Verification.findById;
  const origUserFindById = User.findById;
  const origAssertAccess = verificationService.assertFacultyAccess;
  const origNotifCreate = (await import('../src/models/notification.model.js')).default.create;

  let savedDoc = null;
  const fakeVerif = {
    _id: '507f1f77bcf86cd799439011',
    studentId: 'student-cs',
    facultyId: null,
    targetType: 'PROJECT',
    status: 'PENDING',
    save: async function () {
      savedDoc = this;
      return this;
    },
  };

  Verification.findById = async () => fakeVerif;
  User.findById = async () => ({ _id: '507f1f77bcf86cd799439001', role: 'faculty' });
  verificationService.assertFacultyAccess = async () => true;
  (await import('../src/models/notification.model.js')).default.create = async () => ({});

  const adminUser = { _id: 'admin-1', role: 'admin' };

  try {
    const result = await verificationService.assignFaculty(
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439001',
      adminUser
    );
    assert.equal(result.facultyId, '507f1f77bcf86cd799439001');
    assert.equal(savedDoc.facultyId, '507f1f77bcf86cd799439001');
  } finally {
    Verification.findById = origFindById;
    User.findById = origUserFindById;
    verificationService.assertFacultyAccess = origAssertAccess;
    (await import('../src/models/notification.model.js')).default.create = origNotifCreate;
  }
});

test('SEC-ASSIGN-5: Non-admin is rejected from assigning/reassigning (HTTP 403)', async () => {
  const nonAdminRoles = ['student', 'faculty', 'recruiter', 'alumnus'];

  for (const role of nonAdminRoles) {
    await assert.rejects(
      async () => {
        await verificationService.assignFaculty('507f1f77bcf86cd799439011', 'fac-1', { role });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /only administrators/i);
        return true;
      }
    );

    const req = {
      user: { role },
      validated: { params: { id: '507f1f77bcf86cd799439011' } },
      body: { facultyId: '507f1f77bcf86cd799439001' },
    };

    await assert.rejects(
      async () => {
        await invokeHandler(verificationController.assign, req);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  }
});

test('SEC-ASSIGN-6: Admin cannot assign to faculty outside student branch/college (HTTP 403)', async () => {
  const origFindById = Verification.findById;
  const origUserFindById = User.findById;

  const fakeVerif = {
    _id: '507f1f77bcf86cd799439011',
    studentId: { _id: 'student-cs', branch: 'Computer Science', college: 'MIT' },
    status: 'PENDING',
    targetType: 'PROJECT',
  };

  Verification.findById = async () => fakeVerif;
  User.findById = async () => ({
    _id: '507f1f77bcf86cd799439099',
    role: 'faculty',
    branch: 'Mechanical Engineering',
    college: 'MIT',
  });

  try {
    await assert.rejects(
      async () => {
        await verificationService.assignFaculty('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439099', { role: 'admin' });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /outside your branch/i);
        return true;
      }
    );
  } finally {
    Verification.findById = origFindById;
    User.findById = origUserFindById;
  }
});

test('SEC-ASSIGN-7: Admin cannot assign or reassign a finalized verification (HTTP 409 Conflict)', async () => {
  const origFindById = Verification.findById;

  for (const status of ['VERIFIED', 'REJECTED']) {
    Verification.findById = async () => ({
      _id: '507f1f77bcf86cd799439011',
      status,
    });

    await assert.rejects(
      async () => {
        await verificationService.assignFaculty('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439001', { role: 'admin' });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /finalized/i);
        return true;
      }
    );
  }
  Verification.findById = origFindById;
});

test('SEC-ASSIGN-8: Admin can explicitly unassign a verification (facultyId: null)', async () => {
  const origFindById = Verification.findById;

  let savedDoc = null;
  const fakeVerif = {
    _id: '507f1f77bcf86cd799439011',
    studentId: 'student-cs',
    facultyId: '507f1f77bcf86cd799439001',
    status: 'PENDING',
    targetType: 'PROJECT',
    save: async function () {
      savedDoc = this;
      return this;
    },
  };

  Verification.findById = async () => fakeVerif;

  try {
    const result = await verificationService.assignFaculty('507f1f77bcf86cd799439011', null, { role: 'admin' });
    assert.equal(result.facultyId, null);
    assert.equal(savedDoc.facultyId, null);
  } finally {
    Verification.findById = origFindById;
  }
});
