import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.JWT_SECRET ||= 'test-jwt-secret-test-jwt-secret-test';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-test-refresh-secret';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/vidyalink-test';
process.env.AI_PROVIDER ||= 'deterministic';

const verificationService = (await import('../src/services/verification.service.js')).default;
const Verification = (await import('../src/models/verification.model.js')).default;
const Project = (await import('../src/models/project.model.js')).default;
const Portfolio = (await import('../src/models/portfolio.model.js')).default;
const Notification = (await import('../src/models/notification.model.js')).default;
const Profile = (await import('../src/models/profile.model.js')).default;
const User = (await import('../src/models/user.model.js')).default;

test('TC-VERIF1: Student submits project verification request -> creates PENDING record and notifies student', async () => {
  const origProjectExists = Project.exists;
  const origVerifExists = Verification.exists;
  const origVerifCreate = Verification.create;
  const origNotifCreate = Notification.create;

  let createdVerification = null;
  let createdNotification = null;

  Project.exists = async (query) => {
    assert.equal(query.userId, 'student-123');
    assert.equal(query._id, 'proj-123');
    return true;
  };

  Verification.exists = async (query) => {
    // Check pending conflict
    assert.equal(query.studentId, 'student-123');
    assert.equal(query.status, 'PENDING');
    return false;
  };

  Verification.create = async (doc) => {
    createdVerification = { _id: 'verif-001', ...doc, createdAt: new Date() };
    return createdVerification;
  };

  Notification.create = async (doc) => {
    createdNotification = { _id: 'notif-001', ...doc };
    return createdNotification;
  };

  try {
    const result = await verificationService.createVerification('student-123', {
      targetType: 'PROJECT',
      targetId: 'proj-123',
      remarks: 'Please review capstone architecture',
    });

    assert.equal(result._id, 'verif-001');
    assert.equal(result.status, 'PENDING');
    assert.equal(result.remarks, 'Please review capstone architecture');
    assert.equal(createdNotification.type, 'verification');
    assert.equal(createdNotification.recipient, 'student-123');
  } finally {
    Project.exists = origProjectExists;
    Verification.exists = origVerifExists;
    Verification.create = origVerifCreate;
    Notification.create = origNotifCreate;
  }
});

test('TC-VERIF2: Duplicate pending verification request is rejected with conflict', async () => {
  const origProjectExists = Project.exists;
  const origVerifExists = Verification.exists;

  Project.exists = async () => true;
  Verification.exists = async () => true; // pending exists!

  try {
    await assert.rejects(
      async () => {
        await verificationService.createVerification('student-123', {
          targetType: 'PROJECT',
          targetId: 'proj-123',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /already has a verification request pending/i);
        return true;
      }
    );
  } finally {
    Project.exists = origProjectExists;
    Verification.exists = origVerifExists;
  }
});

test('TC-VERIF3: Faculty requests changes -> updates status to CHANGES_REQUESTED and notifies student', async () => {
  const origFindById = Verification.findById;
  const origNotifCreate = Notification.create;

  let savedVerification = null;
  let notificationSent = null;

  const fakeRecord = {
    _id: 'verif-001',
    studentId: 'student-123',
    facultyId: null,
    targetType: 'PROJECT',
    targetId: 'proj-123',
    status: 'PENDING',
    remarks: null,
    save: async function () {
      savedVerification = this;
      return this;
    },
    populate: async function () {
      return this;
    },
  };

  Verification.findById = async (id) => (id === 'verif-001' ? fakeRecord : null);
  Notification.create = async (doc) => {
    notificationSent = doc;
    return { _id: 'notif-002', ...doc };
  };

  try {
    const result = await verificationService.requestChanges(
      'verif-001',
      'faculty-456',
      'faculty',
      'Please add more unit tests.'
    );

    assert.equal(result.status, 'CHANGES_REQUESTED');
    assert.equal(result.facultyId, 'faculty-456');
    assert.equal(result.remarks, 'Please add more unit tests.');
    assert.equal(notificationSent.recipient, 'student-123');
    assert.equal(notificationSent.title, 'Verification Changes Requested');
    assert.match(notificationSent.message, /Please add more unit tests/);
  } finally {
    Verification.findById = origFindById;
    Notification.create = origNotifCreate;
  }
});

test('TC-VERIF4: Faculty approves -> updates status to VERIFIED, updates Project verificationStatus, generates Portfolio, and notifies student', async () => {
  const origVerifFindById = Verification.findById;
  const origProjectFindByIdAndUpdate = Project.findByIdAndUpdate;
  const origProjectFindById = Project.findById;
  const origPortfolioFindOne = Portfolio.findOne;
  const origPortfolioCreate = Portfolio.create;
  const origNotifCreate = Notification.create;

  let projectStatusUpdated = null;
  let portfolioCreated = null;
  let notificationSent = null;

  const fakeRecord = {
    _id: 'verif-001',
    studentId: { _id: 'student-123', fullName: 'Student Priya' },
    facultyId: null,
    targetType: 'PROJECT',
    targetId: 'proj-123',
    status: 'PENDING',
    remarks: null,
    save: async function () {
      return this;
    },
    populate: async function () {
      return this;
    },
  };

  Verification.findById = async (id) => (id === 'verif-001' ? fakeRecord : null);

  Project.findByIdAndUpdate = async (id, update) => {
    projectStatusUpdated = { id, update };
    return { _id: id, ...update };
  };

  Project.findById = async (id) => ({
    _id: id,
    title: 'Autonomous Rover System',
    technologies: ['C++', 'ROS2', 'OpenCV'],
  });

  Portfolio.findOne = () => ({
    populate: () => ({
      populate: async () => null, // null document found
    }),
  });

  Portfolio.create = async (doc) => {
    portfolioCreated = { _id: 'port-001', ...doc };
    return portfolioCreated;
  };

  Notification.create = async (doc) => {
    notificationSent = doc;
    return { _id: 'notif-003', ...doc };
  };

  try {
    const result = await verificationService.approve(
      'verif-001',
      'faculty-456',
      'faculty',
      'Exceptional research and execution.'
    );

    assert.equal(result.status, 'VERIFIED');
    assert.ok(result.verifiedAt);
    assert.equal(projectStatusUpdated.id, 'proj-123');
    assert.equal(projectStatusUpdated.update.verificationStatus, 'Verified');

    // Official Portfolio credential was generated
    assert.ok(portfolioCreated);
    assert.equal(portfolioCreated.student, 'student-123');
    assert.equal(portfolioCreated.project, 'proj-123');
    assert.ok(portfolioCreated.certificateId);
    assert.ok(portfolioCreated.verificationHash);

    // Notification was dispatched
    assert.equal(notificationSent.recipient, 'student-123');
    assert.equal(notificationSent.title, 'Verification Approved');
  } finally {
    Verification.findById = origVerifFindById;
    Project.findByIdAndUpdate = origProjectFindByIdAndUpdate;
    Project.findById = origProjectFindById;
    Portfolio.findOne = origPortfolioFindOne;
    Portfolio.create = origPortfolioCreate;
    Notification.create = origNotifCreate;
  }
});

test('TC-VERIF5: Faculty sees own branch submissions (Computer Science)', async () => {
  const origProfileFind = Profile.find;
  const origVerifFind = Verification.find;

  const csFaculty = { _id: 'fac-cs-1', role: 'faculty', branch: 'Computer Science' };
  let capturedQuery = null;

  Profile.find = (query) => ({
    distinct: async (field) => {
      if (query.branch === 'Computer Science' || (query.branch instanceof RegExp && query.branch.test('Computer Science'))) {
        return ['student-cs-1', 'student-cs-2'];
      }
      return [];
    },
  });

  Verification.find = (query) => {
    capturedQuery = query;
    return {
      populate: () => ({
        sort: async () => [
          { _id: 'verif-cs-1', studentId: { _id: 'student-cs-1', fullName: 'CS Student', branch: 'Computer Science' }, status: 'PENDING' },
        ],
      }),
    };
  };

  try {
    const queue = await verificationService.getPendingVerifications(csFaculty);
    assert.equal(capturedQuery.status, 'PENDING');
    assert.deepEqual(capturedQuery.studentId, { $in: ['student-cs-1', 'student-cs-2'] });
    assert.equal(queue.length, 1);
    assert.equal(queue[0]._id, 'verif-cs-1');
  } finally {
    Profile.find = origProfileFind;
    Verification.find = origVerifFind;
  }
});

test('TC-VERIF6: Faculty cannot see another branch submissions (Mechanical faculty gets filtered queue)', async () => {
  const origProfileFind = Profile.find;
  const origVerifFind = Verification.find;

  const mechFaculty = { _id: 'fac-mech-1', role: 'faculty', branch: 'Mechanical Engineering' };
  let capturedQuery = null;

  Profile.find = (query) => ({
    distinct: async () => {
      // No mechanical students found
      return [];
    },
  });

  Verification.find = (query) => {
    capturedQuery = query;
    return {
      populate: () => ({
        sort: async () => [],
      }),
    };
  };

  try {
    const queue = await verificationService.getPendingVerifications(mechFaculty);
    assert.equal(capturedQuery.status, 'PENDING');
    assert.deepEqual(capturedQuery.studentId, { $in: [] });
    assert.equal(queue.length, 0);
  } finally {
    Profile.find = origProfileFind;
    Verification.find = origVerifFind;
  }
});

test('TC-VERIF7: Direct verification access is protected against ineligible branch faculty', async () => {
  const origVerifFindById = Verification.findById;

  const mechFaculty = { _id: 'fac-mech-1', role: 'faculty', branch: 'Mechanical Engineering' };
  const csVerification = {
    _id: 'verif-cs-1',
    studentId: { _id: 'student-cs-1', fullName: 'CS Student', branch: 'Computer Science' },
    status: 'PENDING',
    targetType: 'PROJECT',
    targetId: 'proj-1',
    save: async () => csVerification,
    populate: async () => csVerification,
  };

  const createMockQuery = (res) => {
    const p = Promise.resolve(res);
    p.populate = () => createMockQuery(res);
    return p;
  };

  Verification.findById = (id) => createMockQuery(id === 'verif-cs-1' ? csVerification : null);

  try {
    // 1. Direct detail access attempt
    await assert.rejects(
      async () => {
        await verificationService.getFacultyVerificationDetail('verif-cs-1', mechFaculty);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /not authorized to access or review verification submissions outside your branch/i);
        return true;
      }
    );

    // 2. Direct approval attempt
    await assert.rejects(
      async () => {
        await verificationService.approve('verif-cs-1', 'fac-mech-1', 'faculty', 'Remarks', mechFaculty);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /not authorized to access or review verification submissions outside your branch/i);
        return true;
      }
    );

    // 3. Direct reject attempt
    await assert.rejects(
      async () => {
        await verificationService.reject('verif-cs-1', 'fac-mech-1', 'faculty', 'Remarks', mechFaculty);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /not authorized to access or review verification submissions outside your branch/i);
        return true;
      }
    );

    // 4. Direct changes requested attempt
    await assert.rejects(
      async () => {
        await verificationService.requestChanges('verif-cs-1', 'fac-mech-1', 'faculty', 'Remarks', mechFaculty);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /not authorized to access or review verification submissions outside your branch/i);
        return true;
      }
    );
  } finally {
    Verification.findById = origVerifFindById;
  }
});

test('TC-VERIF8: Student submission enters correct queue', async () => {
  const origProjectExists = Project.exists;
  const origVerifExists = Verification.exists;
  const origVerifCreate = Verification.create;
  const origNotifCreate = Notification.create;

  Project.exists = async () => true;
  Verification.exists = async () => false;
  Verification.create = async (doc) => ({ _id: 'verif-new-1', ...doc, createdAt: new Date() });
  Notification.create = async () => ({ _id: 'notif-1' });

  try {
    const verif = await verificationService.createVerification('student-cs-1', {
      targetType: 'PROJECT',
      targetId: 'proj-1',
      remarks: 'Please verify CS project',
    });

    assert.equal(verif._id, 'verif-new-1');
    assert.equal(verif.studentId, 'student-cs-1');
    assert.equal(verif.status, 'PENDING');
  } finally {
    Project.exists = origProjectExists;
    Verification.exists = origVerifExists;
    Verification.create = origVerifCreate;
    Notification.create = origNotifCreate;
  }
});

test('TC-VERIF9: Multiple faculty members in the same branch both access branch queue without random exclusion', async () => {
  const origProfileFind = Profile.find;
  const origVerifFind = Verification.find;

  const csFacultyA = { _id: 'fac-cs-1', role: 'faculty', branch: 'Computer Science' };
  const csFacultyB = { _id: 'fac-cs-2', role: 'faculty', branch: 'Computer Science' };

  Profile.find = () => ({
    distinct: async () => ['student-cs-1'],
  });

  Verification.find = (query) => ({
    populate: () => ({
      sort: async () => [
        { _id: 'verif-cs-1', studentId: { _id: 'student-cs-1', branch: 'Computer Science' }, status: 'PENDING' },
      ],
    }),
  });

  try {
    const queueA = await verificationService.getPendingVerifications(csFacultyA);
    const queueB = await verificationService.getPendingVerifications(csFacultyB);

    assert.equal(queueA.length, 1);
    assert.equal(queueB.length, 1);
    assert.equal(queueA[0]._id, queueB[0]._id);
  } finally {
    Profile.find = origProfileFind;
    Verification.find = origVerifFind;
  }
});

test('TC-VERIF10: Dynamic data-driven branch eligibility without hardcoded mappings', async () => {
  const origProfileFind = Profile.find;
  const origVerifFind = Verification.find;

  const bioFaculty = { _id: 'fac-bio-1', role: 'faculty', branch: 'Biomedical Engineering' };

  let queriedBranch = null;
  Profile.find = (query) => {
    queriedBranch = query.branch;
    return {
      distinct: async () => ['student-bio-1'],
    };
  };

  Verification.find = (query) => ({
    populate: () => ({
      sort: async () => [
        { _id: 'verif-bio-1', studentId: { _id: 'student-bio-1', branch: 'Biomedical Engineering' }, status: 'PENDING' },
      ],
    }),
  });

  try {
    const queue = await verificationService.getPendingVerifications(bioFaculty);
    assert.equal(queriedBranch, 'Biomedical Engineering');
    assert.equal(queue.length, 1);
    assert.equal(queue[0]._id, 'verif-bio-1');
  } finally {
    Profile.find = origProfileFind;
    Verification.find = origVerifFind;
  }
});
