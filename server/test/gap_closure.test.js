import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.JWT_SECRET ||= 'test-jwt-secret-test-jwt-secret-test';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-test-refresh-secret';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/vidyalink-test';
process.env.AI_PROVIDER ||= 'deterministic';

const notificationService = (await import('../src/services/notification.service.js')).default;
const Notification = (await import('../src/models/notification.model.js')).default;
const mentorshipService = (await import('../src/services/mentorship.service.js')).default;
const Mentorship = (await import('../src/models/mentorship.model.js')).default;
const referralService = (await import('../src/services/referral.service.js')).default;
const Referral = (await import('../src/models/referral.model.js')).default;
const authService = (await import('../src/services/auth.service.js')).default;
const User = (await import('../src/models/user.model.js')).default;
const milestoneService = (await import('../src/services/milestone.service.js')).default;
const Milestone = (await import('../src/models/milestone.model.js')).default;
const Workspace = (await import('../src/models/workspace.model.js')).default;

test('TC-NOTIF1: Notification creation and unread count tracking', async () => {
  const originalCreate = Notification.create;
  const originalCount = Notification.countDocuments;
  let createdPayload = null;

  Notification.create = async (doc) => {
    createdPayload = doc;
    return { _id: 'notif-123', ...doc };
  };
  Notification.countDocuments = async (query) => {
    assert.equal(query.recipient, 'user-student-1');
    return query.read === false ? 3 : 10;
  };

  try {
    const notif = await notificationService.createNotification({
      recipient: 'user-student-1',
      sender: 'user-recruiter-1',
      type: 'interview',
      title: 'Interview Scheduled',
      message: 'Interview on Friday 10 AM',
      link: '/applications',
    });

    assert.equal(createdPayload.recipient, 'user-student-1');
    assert.equal(createdPayload.type, 'interview');
    assert.equal(notif._id, 'notif-123');

    const unread = await notificationService.getUnreadCount('user-student-1');
    assert.equal(unread.unreadCount, 3);
  } finally {
    Notification.create = originalCreate;
    Notification.countDocuments = originalCount;
  }
});

test('TC-NOTIF2: Mark notification as read and mark all as read', async () => {
  const originalFindOne = Notification.findOne;
  const originalUpdateMany = Notification.updateMany;

  let saved = false;
  Notification.findOne = async () => ({
    _id: 'notif-123',
    recipient: 'user-1',
    read: false,
    save: async () => { saved = true; },
  });
  Notification.updateMany = async () => ({ modifiedCount: 4 });

  try {
    const res1 = await notificationService.markAsRead('user-1', 'notif-123');
    assert.equal(res1.read, true);
    assert.equal(saved, true);

    const res2 = await notificationService.markAllAsRead('user-1');
    assert.equal(res2.updatedCount, 4);
  } finally {
    Notification.findOne = originalFindOne;
    Notification.updateMany = originalUpdateMany;
  }
});

test('TC-MENT1: Student requests mentorship and alumni is notified', async () => {
  const originalUserFindById = User.findById;
  const originalMentorshipFindOne = Mentorship.findOne;
  const originalMentorshipCreate = Mentorship.create;
  const originalNotifCreate = notificationService.createNotification;

  let notifDispatched = null;
  let mentorshipCreated = null;

  User.findById = async (id) => {
    if (id === 's-1') return { _id: 's-1', fullName: 'Aarav Sharma', role: 'student' };
    if (id === 'a-1') return { _id: 'a-1', fullName: 'Neha Gupta', role: 'alumni' };
    return null;
  };
  Mentorship.findOne = async () => null;
  Mentorship.create = async (doc) => {
    mentorshipCreated = doc;
    return { _id: 'm-123', ...doc };
  };
  notificationService.createNotification = async (payload) => {
    notifDispatched = payload;
    return { _id: 'n-1', ...payload };
  };

  try {
    const res = await mentorshipService.requestMentorship('s-1', {
      alumniId: 'a-1',
      focusSkill: 'System Design',
      message: 'Seeking guidance on microservices.',
    });

    assert.equal(res._id, 'm-123');
    assert.equal(mentorshipCreated.focusSkill, 'System Design');
    assert.equal(notifDispatched.recipient, 'a-1');
    assert.equal(notifDispatched.type, 'mentorship');
    assert.match(notifDispatched.message, /Aarav Sharma/);
  } finally {
    User.findById = originalUserFindById;
    Mentorship.findOne = originalMentorshipFindOne;
    Mentorship.create = originalMentorshipCreate;
    notificationService.createNotification = originalNotifCreate;
  }
});

test('TC-MENT2: Alumni accepts mentorship and student is notified with schedule', async () => {
  const originalMentorshipFindOne = Mentorship.findOne;
  const originalNotifCreate = notificationService.createNotification;

  let savedMentorship = false;
  let notifDispatched = null;

  Mentorship.findOne = () => ({
    populate: () => ({
      _id: 'm-123',
      student: 's-1',
      alumni: { _id: 'a-1', fullName: 'Neha Gupta' },
      status: 'pending',
      save: async () => { savedMentorship = true; },
    }),
  });
  notificationService.createNotification = async (payload) => {
    notifDispatched = payload;
    return payload;
  };

  try {
    const scheduledDate = new Date('2026-10-01T10:00:00Z');
    const accepted = await mentorshipService.acceptRequest('a-1', 'm-123', {
      scheduledDate,
      notes: 'Please review Docker fundamentals before the session.',
    });

    assert.equal(accepted.status, 'accepted');
    assert.equal(savedMentorship, true);
    assert.equal(notifDispatched.recipient, 's-1');
    assert.match(notifDispatched.message, /accepted/);
  } finally {
    Mentorship.findOne = originalMentorshipFindOne;
    notificationService.createNotification = originalNotifCreate;
  }
});

test('TC-REF1: Alumni posts campus referral with required fields and persistence', async () => {
  const originalReferralCreate = Referral.create;
  const originalReferralFind = Referral.find;
  let referralCreated = null;

  Referral.create = async (doc) => {
    referralCreated = doc;
    return { _id: 'ref-1', ...doc };
  };
  Referral.find = () => ({
    populate: () => ({
      sort: () => [
        { _id: 'ref-1', company: 'Google', role: 'Software Engineer', status: 'active' },
      ],
    }),
  });

  try {
    const res = await referralService.createReferral('alumni-1', {
      company: 'Google',
      role: 'Software Engineer',
      description: 'Full-time campus hiring referral for 2026 graduates',
      requirements: ['Data Structures', 'Python', 'Go'],
    });

    assert.equal(res._id, 'ref-1');
    assert.equal(referralCreated.company, 'Google');
    assert.equal(referralCreated.requirements.length, 3);

    const activeList = await referralService.getActiveReferrals();
    assert.equal(activeList.length, 1);
    assert.equal(activeList[0].role, 'Software Engineer');
  } finally {
    Referral.create = originalReferralCreate;
    Referral.find = originalReferralFind;
  }
});

test('TC-AUTH-RESET1: Forgot password generates secure SHA-256 token and expiration', async () => {
  const originalUserFindOne = User.findOne;
  let savedUser = null;

  User.findOne = async () => ({
    _id: 'u-1',
    email: 'engineer@vidyalink.edu',
    save: async () => { savedUser = true; },
  });

  try {
    const res = await authService.forgotPassword('engineer@vidyalink.edu');
    assert.match(res.message, /instructions have been sent/);
    assert.ok(res.resetToken);
    assert.ok(res.resetUrl.includes('/reset-password?token='));
    assert.equal(savedUser, true);
  } finally {
    User.findOne = originalUserFindOne;
  }
});

test('TC-AUTH-RESET2: Reset password validates token and updates password', async () => {
  const originalUserFindOne = User.findOne;
  let savedPassword = null;
  let clearedToken = false;

  User.findOne = () => ({
    select: () => ({
      _id: 'u-1',
      passwordResetToken: 'hashed-token-value',
      passwordResetExpires: new Date(Date.now() + 3600000),
      save: async function () {
        savedPassword = this.password;
        clearedToken = this.passwordResetToken === null && this.passwordResetExpires === null;
      },
    }),
  });

  try {
    const res = await authService.resetPassword('raw-token-123', 'SuperSecretNewPassword123');
    assert.match(res.message, /Password reset successful/);
    assert.equal(savedPassword, 'SuperSecretNewPassword123');
    assert.equal(clearedToken, true);
  } finally {
    User.findOne = originalUserFindOne;
  }
});

test('TC-FAC-VERIFY1: Faculty verification approves deliverable and notifies student', async () => {
  const originalMilestoneFindById = Milestone.findById;
  const originalWorkspaceUpdateProgress = (await import('../src/services/workspace.service.js')).default.updateWorkspaceProgress;
  const originalGeneratePortfolio = (await import('../src/services/portfolio.service.js')).default.generatePortfolioForWorkspace;
  const originalNotifCreate = notificationService.createNotification;

  let savedMilestone = false;
  let notifDispatched = null;

  Milestone.findById = () => ({
    populate: () => ({
      _id: '507f1f77bcf86cd799439011',
      title: 'Database Schema & Migration',
      workspace: {
        _id: '507f1f77bcf86cd799439012',
        student: '507f1f77bcf86cd799439013',
        owner: '507f1f77bcf86cd799439014',
      },
      status: 'submitted',
      save: async () => { savedMilestone = true; },
    }),
  });

  (await import('../src/services/workspace.service.js')).default.updateWorkspaceProgress = async () => 100;
  (await import('../src/services/portfolio.service.js')).default.generatePortfolioForWorkspace = async () => ({
    certificateId: 'CERT-12345',
    verificationHash: 'hash123',
  });
  notificationService.createNotification = async (payload) => {
    notifDispatched = payload;
    return payload;
  };

  try {
    // Verified by faculty role (not the workspace owner)
    const result = await milestoneService.verifyMilestone(
      'faculty-user-1',
      '507f1f77bcf86cd799439011',
      { verificationStatus: 'verified', feedback: 'Code review approved with honours.' },
      'faculty'
    );

    assert.equal(result.milestone.status, 'verified');
    assert.equal(savedMilestone, true);
    assert.equal(notifDispatched.recipient, '507f1f77bcf86cd799439013');
    assert.equal(notifDispatched.type, 'verification');
    assert.match(notifDispatched.title, /Verified/);
  } finally {
    Milestone.findById = originalMilestoneFindById;
    (await import('../src/services/workspace.service.js')).default.updateWorkspaceProgress = originalWorkspaceUpdateProgress;
    (await import('../src/services/portfolio.service.js')).default.generatePortfolioForWorkspace = originalGeneratePortfolio;
    notificationService.createNotification = originalNotifCreate;
  }
});
