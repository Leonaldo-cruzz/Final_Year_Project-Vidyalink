import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAdminInput,
  provisionAdmin,
  parseArgs,
} from '../src/scripts/create-admin.js';

test('ADMIN-SEC-1: Creates an administrator when email is unused', async () => {
  let findCalledWith = null;
  let savedAdminDoc = null;
  let connectCalledWith = null;
  let disconnectCalled = false;

  const mockDb = {
    connect: async (uri) => { connectCalledWith = uri; },
    disconnect: async () => { disconnectCalled = true; },
  };

  class MockUser {
    constructor(data) {
      Object.assign(this, data);
    }
    static async findOne(query) {
      findCalledWith = query;
      return null; // Unused email
    }
    async save() {
      savedAdminDoc = this;
      return this;
    }
  }

  const logs = [];
  const mockLogger = {
    info: (msg) => logs.push(msg),
    warn: (msg) => logs.push(msg),
    error: (msg) => logs.push(msg),
  };

  const result = await provisionAdmin({
    email: 'NewAdmin@Vidyalink.edu',
    password: 'ValidPassword123!',
    fullName: 'Platform Superadmin',
    mongoUri: 'mongodb://mock-cluster/db',
    userModel: MockUser,
    dbConnection: mockDb,
    logger: mockLogger,
  });

  assert.equal(result.action, 'created');
  assert.equal(result.email, 'newadmin@vidyalink.edu');
  assert.equal(connectCalledWith, 'mongodb://mock-cluster/db');
  assert.equal(disconnectCalled, true);
  assert.deepEqual(findCalledWith, { email: 'newadmin@vidyalink.edu' });
  assert.ok(savedAdminDoc, 'New admin document must be saved');
  assert.equal(savedAdminDoc.role, 'admin');
  assert.equal(savedAdminDoc.isEmailVerified, true);
  assert.equal(savedAdminDoc.status, 'active');
  assert.equal(savedAdminDoc.password, 'ValidPassword123!');
});

test('ADMIN-SEC-2: Refuses to promote an existing non-admin user (fail-closed)', async () => {
  let disconnectCalled = false;
  let saveCalled = false;

  const mockDb = {
    connect: async () => {},
    disconnect: async () => { disconnectCalled = true; },
  };

  const existingStudent = {
    _id: 'student-123',
    email: 'student@vidyalink.edu',
    fullName: 'Existing Student',
    role: 'student',
    password: '$2a$12$existingHashedPasswordString',
    status: 'active',
    isEmailVerified: true,
    save: async () => {
      saveCalled = true;
      throw new Error('save() must NEVER be called on existing user');
    },
  };

  class MockUser {
    static async findOne() {
      return existingStudent;
    }
  }

  const mockLogger = { info: () => {}, warn: () => {}, error: () => {} };

  await assert.rejects(
    async () => {
      await provisionAdmin({
        email: 'student@vidyalink.edu',
        password: 'ValidPassword123!',
        fullName: 'Attempted Escalate',
        mongoUri: 'mongodb://mock-cluster/db',
        userModel: MockUser,
        dbConnection: mockDb,
        logger: mockLogger,
      });
    },
    (err) => {
      assert.match(err.message, /Automatic privilege promotion is forbidden/i);
      return true;
    }
  );

  assert.equal(saveCalled, false, 'Existing student record must not be modified');
  assert.equal(existingStudent.role, 'student', 'Role must remain student');
  assert.equal(disconnectCalled, true, 'Database connection must be closed');
});

test('ADMIN-SEC-3: Refuses to overwrite an existing user password', async () => {
  const originalHash = '$2a$12$originalHashedPasswordCannotOverwrite';
  let saveCalled = false;

  const existingFaculty = {
    _id: 'faculty-456',
    email: 'faculty@vidyalink.edu',
    role: 'faculty',
    password: originalHash,
    save: async () => {
      saveCalled = true;
    },
  };

  class MockUser {
    static async findOne() {
      return existingFaculty;
    }
  }

  const mockDb = {
    connect: async () => {},
    disconnect: async () => {},
  };

  await assert.rejects(
    async () => {
      await provisionAdmin({
        email: 'faculty@vidyalink.edu',
        password: 'AttackerNewPassword123!',
        fullName: 'Faculty User',
        mongoUri: 'mongodb://mock-cluster/db',
        userModel: MockUser,
        dbConnection: mockDb,
        logger: { info: () => {}, warn: () => {}, error: () => {} },
      });
    },
    /Automatic privilege promotion is forbidden/
  );

  assert.equal(saveCalled, false);
  assert.equal(existingFaculty.password, originalHash, 'Password must remain untouched');
});

test('ADMIN-SEC-4: Handles already-admin account idempotently without mutations', async () => {
  let saveCalled = false;
  let disconnectCalled = false;

  const existingAdmin = {
    _id: 'admin-001',
    email: 'admin@vidyalink.edu',
    fullName: 'Existing Admin',
    role: 'admin',
    password: '$2a$12$existingAdminPasswordHash',
    status: 'active',
    isEmailVerified: true,
    save: async () => {
      saveCalled = true;
      throw new Error('save() must not be called when admin already exists');
    },
  };

  class MockUser {
    static async findOne() {
      return existingAdmin;
    }
  }

  const mockDb = {
    connect: async () => {},
    disconnect: async () => { disconnectCalled = true; },
  };

  const logs = [];
  const mockLogger = {
    info: (msg) => logs.push(msg),
    warn: (msg) => logs.push(msg),
    error: (msg) => logs.push(msg),
  };

  const result = await provisionAdmin({
    email: 'admin@vidyalink.edu',
    password: 'NewAdminPassword123!',
    fullName: 'Different Name',
    mongoUri: 'mongodb://mock-cluster/db',
    userModel: MockUser,
    dbConnection: mockDb,
    logger: mockLogger,
  });

  assert.equal(result.action, 'already_exists');
  assert.equal(saveCalled, false, 'No save should occur for existing admin');
  assert.equal(disconnectCalled, true);
  assert.ok(logs.some((l) => l.includes('Administrator account already exists')));
});

test('ADMIN-SEC-5: Rejects invalid emails and weak passwords before database connection', async () => {
  let connectCalled = false;
  const mockDb = {
    connect: async () => { connectCalled = true; },
    disconnect: async () => {},
  };

  const invalidInputs = [
    { email: '', password: 'ValidPassword1!', fullName: 'Admin User', expected: /Email is required/ },
    { email: 'not-an-email', password: 'ValidPassword1!', fullName: 'Admin User', expected: /valid email address/ },
    { email: 'user@', password: 'ValidPassword1!', fullName: 'Admin User', expected: /valid email address/ },
    { email: 'admin@domain.com', password: 'short', fullName: 'Admin User', expected: /at least 8 characters/ },
    { email: 'admin@domain.com', password: 'nouppercase123!', fullName: 'Admin User', expected: /at least one uppercase/ },
    { email: 'admin@domain.com', password: 'NOLOWERCASE123!', fullName: 'Admin User', expected: /at least one lowercase/ },
    { email: 'admin@domain.com', password: 'NoNumbersHere!!', fullName: 'Admin User', expected: /at least one number/ },
    { email: 'admin@domain.com', password: 'NoSpecialChars123', fullName: 'Admin User', expected: /at least one special character/ },
    { email: 'admin@domain.com', password: 'ValidPassword1!', fullName: 'A', expected: /between 3 and 100 characters/ },
  ];

  for (const input of invalidInputs) {
    connectCalled = false;
    await assert.rejects(
      async () => {
        await provisionAdmin({
          ...input,
          mongoUri: 'mongodb://mock/db',
          userModel: class {},
          dbConnection: mockDb,
          logger: { info: () => {}, warn: () => {}, error: () => {} },
        });
      },
      input.expected
    );
    assert.equal(connectCalled, false, `Database connection must not be attempted for invalid input: ${input.expected}`);
  }
});

test('ADMIN-SEC-6: Handles database connection errors and duplicate-key races safely', async () => {
  // Test 6A: Database connection timeout
  let disconnectCalled = false;
  const failingDb = {
    connect: async () => { throw new Error('Database connection timed out'); },
    disconnect: async () => { disconnectCalled = true; },
  };

  await assert.rejects(
    async () => {
      await provisionAdmin({
        email: 'admin@vidyalink.edu',
        password: 'ValidPassword123!',
        fullName: 'Super Admin',
        mongoUri: 'mongodb://unreachable:27017/db',
        userModel: class {},
        dbConnection: failingDb,
        logger: { info: () => {}, warn: () => {}, error: () => {} },
      });
    },
    /Database connection timed out/
  );

  // Test 6B: Race condition (duplicate key error 11000)
  class RaceUser {
    static async findOne() { return null; }
    async save() {
      const err = new Error('E11000 duplicate key error collection: vidyalink.users index: email_1');
      err.code = 11000;
      throw err;
    }
  }

  const okDb = {
    connect: async () => {},
    disconnect: async () => { disconnectCalled = true; },
  };

  await assert.rejects(
    async () => {
      await provisionAdmin({
        email: 'race@vidyalink.edu',
        password: 'ValidPassword123!',
        fullName: 'Race Candidate',
        mongoUri: 'mongodb://mock/db',
        userModel: RaceUser,
        dbConnection: okDb,
        logger: { info: () => {}, warn: () => {}, error: () => {} },
      });
    },
    /Concurrent registration detected/
  );
  assert.equal(disconnectCalled, true, 'Database must disconnect on race error');
});

test('ADMIN-SEC-7: Secrets and passwords are never included in output logs or errors', async () => {
  const secretPassword = 'TopSecretPassword#987654321!';
  const logs = [];

  const capturingLogger = {
    info: (msg) => logs.push(String(msg)),
    warn: (msg) => logs.push(String(msg)),
    error: (msg) => logs.push(String(msg)),
  };

  const mockDb = {
    connect: async () => {},
    disconnect: async () => {},
  };

  class MockUser {
    static async findOne() { return null; }
    async save() { return this; }
  }

  // Run creation
  await provisionAdmin({
    email: 'privacy@vidyalink.edu',
    password: secretPassword,
    fullName: 'Privacy Admin',
    mongoUri: 'mongodb://secret-user:secret-pwd@cluster/db',
    userModel: MockUser,
    dbConnection: mockDb,
    logger: capturingLogger,
  });

  for (const logLine of logs) {
    assert.equal(logLine.includes(secretPassword), false, `Log line leaked secret password: ${logLine}`);
    assert.equal(logLine.includes('secret-pwd'), false, `Log line leaked database password: ${logLine}`);
  }
});

test('ADMIN-SEC-8: CLI argument parser correctly extracts flags', () => {
  const args = parseArgs(['--email=admin@test.com', '--name=Super Admin']);
  assert.equal(args.email, 'admin@test.com');
  assert.equal(args.name, 'Super Admin');
});
