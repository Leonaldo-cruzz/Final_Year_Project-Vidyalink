import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET ||= 'admin-module-test-secret';
process.env.JWT_REFRESH_SECRET ||= 'admin-module-test-refresh-secret';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/vidyalink_admin_module_test';

const [
  { default: User },
  { default: Project },
  { default: Certificate },
  { default: Application },
  { default: Deliverable },
  { default: adminService },
  { default: adminAnalyticsService },
  { listUsersSchema },
  { default: authorize },
] = await Promise.all([
  import('../src/models/user.model.js'),
  import('../src/models/project.model.js'),
  import('../src/models/certificate.model.js'),
  import('../src/models/application.model.js'),
  import('../src/models/deliverable.model.js'),
  import('../src/services/admin.service.js'),
  import('../src/services/adminAnalytics.service.js'),
  import('../src/validators/admin.validator.js'),
  import('../src/middleware/role.middleware.js'),
]);

const validId = '507f1f77bcf86cd799439011';
const otherValidId = '507f1f77bcf86cd799439012';

test('admin list validator constrains pagination and sort fields', () => {
  const valid = listUsersSchema.safeParse({
    query: { page: '2', limit: '25', search: 'Ada', role: 'student', sortBy: 'fullName', sortOrder: 'asc' },
  });
  assert.equal(valid.success, true);
  assert.deepEqual(valid.data.query, {
    page: 2,
    limit: 25,
    search: 'Ada',
    role: 'student',
    sortBy: 'fullName',
    sortOrder: 'asc',
  });

  const injectedSort = listUsersSchema.safeParse({ query: { sortBy: '$where' } });
  assert.equal(injectedSort.success, false);
});

test('admin user listing escapes search and applies pagination', async () => {
  const originalFind = User.find;
  const originalCountDocuments = User.countDocuments;
  let receivedFilter;
  let receivedSort;
  let receivedSkip;
  let receivedLimit;

  try {
    User.find = (filter) => {
      receivedFilter = filter;
      return {
        select() { return this; },
        sort(sort) { receivedSort = sort; return this; },
        skip(skip) { receivedSkip = skip; return this; },
        limit(limit) { receivedLimit = limit; return this; },
        lean: async () => [{ _id: validId, fullName: 'Ada Lovelace', email: 'ada@example.com', role: 'student', status: 'active' }],
      };
    };
    User.countDocuments = async () => 1;

    const result = await adminService.getUsers({
      page: 3,
      limit: 10,
      search: 'ada.*',
      role: 'student',
      status: 'active',
      sortBy: 'fullName',
      sortOrder: 'asc',
    });

    assert.equal(receivedFilter.role, 'student');
    assert.equal(receivedFilter.status, 'active');
    assert.equal(receivedFilter.$or[0].fullName.source, '^ada\\.\\*');
    assert.deepEqual(receivedSort, { fullName: 1, _id: -1 });
    assert.equal(receivedSkip, 20);
    assert.equal(receivedLimit, 10);
    assert.deepEqual(result.pagination, { page: 3, limit: 10, total: 1, totalPages: 1 });
  } finally {
    User.find = originalFind;
    User.countDocuments = originalCountDocuments;
  }
});

test('last active administrator cannot be demoted', async () => {
  const originalFindById = User.findById;
  const originalCountDocuments = User.countDocuments;
  const target = {
    _id: validId,
    role: 'admin',
    status: 'active',
  };

  try {
    User.findById = () => ({ select: async () => target });
    User.countDocuments = async () => 0;

    await assert.rejects(
      adminService.updateUserRole(otherValidId, validId, 'student'),
      (error) => error.statusCode === 409 && /last active administrator/i.test(error.message),
    );
  } finally {
    User.findById = originalFindById;
    User.countDocuments = originalCountDocuments;
  }
});

test('existing RBAC middleware rejects a non-admin user', () => {
  const next = () => assert.fail('next must not be called');
  assert.throws(
    () => authorize('admin')({ user: { role: 'student' } }, {}, next),
    (error) => error.statusCode === 403,
  );
});

test('overview uses aggregate results instead of application-side document scans', async () => {
  const originals = {
    userAggregate: User.aggregate,
    projectAggregate: Project.aggregate,
    certificateAggregate: Certificate.aggregate,
    applicationAggregate: Application.aggregate,
    deliverableCountDocuments: Deliverable.countDocuments,
  };

  try {
    User.aggregate = async () => [{ users: 12, students: 7, faculty: 2, recruiters: 2, alumni: 1 }];
    Project.aggregate = async (pipeline) => (
      pipeline.some((stage) => stage.$unionWith)
        ? [{ count: 4 }]
        : [{ pending: 3, verified: 5, rejected: 1 }]
    );
    Certificate.aggregate = async () => [{ pending: 2, verified: 1, rejected: 4 }];
    Application.aggregate = async () => [{ shortlists: 6, interviews: 3, recruiterActivities: 9 }];
    Deliverable.countDocuments = async () => 2;

    const overview = await adminAnalyticsService.getOverview();
    assert.equal(overview.users, 12);
    assert.equal(overview.projects, 9);
    assert.equal(overview.pendingVerifications, 5);
    assert.equal(overview.verifiedStudents, 4);
    assert.equal(overview.shortlists, 6);
    assert.equal(overview.referrals, null);
  } finally {
    User.aggregate = originals.userAggregate;
    Project.aggregate = originals.projectAggregate;
    Certificate.aggregate = originals.certificateAggregate;
    Application.aggregate = originals.applicationAggregate;
    Deliverable.countDocuments = originals.deliverableCountDocuments;
  }
});
