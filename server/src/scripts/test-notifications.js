/**
 * VIDYALINK — Notifications Backend Integration Test Suite
 *
 * Run with:   node server/src/scripts/test-notifications.js
 * Requires:   server running at API_BASE_URL (default: http://localhost:5000/api/v1)
 */

import process from 'node:process';
import mongoose from 'mongoose';
import env from '../config/env.js';
import notificationService from '../services/notification.service.js';
import notificationEventsService from '../services/notificationEvents.service.js';
import { NOTIFICATION_TYPE } from '../models/notification.model.js';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

// ─── Console helpers ─────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

let passed = 0;
let failed = 0;

function logHeader(text) {
  console.log(`\n${C.bright}${C.cyan}=== ${text} ===${C.reset}`);
}

function logPass(msg) {
  console.log(`${C.green}✔ PASS${C.reset} ${msg}`);
  passed++;
}

function logFail(msg, detail = '') {
  console.error(`${C.red}✖ FAIL${C.reset} ${msg}`);
  if (detail) console.error(`  ${C.red}Detail:${C.reset}`, detail);
  failed++;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function api(endpoint, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, ok: res.ok, data };
}

function assert(label, res, expectedStatus) {
  if (res.status === expectedStatus) {
    logPass(`${label} → HTTP ${res.status}`);
    return true;
  }
  logFail(`${label} → Expected HTTP ${expectedStatus}, got ${res.status}`, JSON.stringify(res.data));
  return false;
}

// ─── Main Test Runner ────────────────────────────────────────────────────────

const ts = Date.now();

const TEST_USERS = {
  studentA: {
    fullName: 'Notification Test Student A',
    email: `notif_student_a_${ts}@vidyalink.test`,
    password: 'Password@1234',
    role: 'student',
  },
  studentB: {
    fullName: 'Notification Test Student B',
    email: `notif_student_b_${ts}@vidyalink.test`,
    password: 'Password@1234',
    role: 'student',
  },
  recruiter: {
    fullName: 'Notification Test Recruiter',
    email: `notif_recruiter_${ts}@vidyalink.test`,
    password: 'Password@1234',
    role: 'recruiter',
  },
};

async function loginUser(email, password) {
  const res = await api('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return res.data?.data?.accessToken;
}

async function run() {
  logHeader('VIDYALINK Notifications Backend Integration Test Suite');
  console.log(`Target: ${BASE_URL}\n`);

  try {
    // 0. Setup & Database Connection
    logHeader('0. Setup & Authentication');
    await mongoose.connect(env.MONGODB_URI);
    logPass('MongoDB Connected');

    // Register test users
    for (const [key, user] of Object.entries(TEST_USERS)) {
      const reg = await api('/auth/register', { method: 'POST', body: user });
      if (reg.status === 201 || reg.status === 409) {
        logPass(`Registered / ready: ${key} (${user.email})`);
      } else {
        logFail(`Failed to register ${key}`, JSON.stringify(reg.data));
      }
    }

    const tokens = {};
    for (const [key, user] of Object.entries(TEST_USERS)) {
      tokens[key] = await loginUser(user.email, user.password);
      if (tokens[key]) {
        logPass(`Logged in: ${key}`);
      } else {
        logFail(`Login failed: ${key}`);
      }
    }

    const meA = await api('/auth/me', { token: tokens.studentA });
    const studentAId = meA.data?.data?.user?._id || meA.data?.data?._id;

    const meB = await api('/auth/me', { token: tokens.studentB });
    const studentBId = meB.data?.data?.user?._id || meB.data?.data?._id;

    const meR = await api('/auth/me', { token: tokens.recruiter });
    const recruiterId = meR.data?.data?.user?._id || meR.data?.data?._id;

    // 1. Seed Direct & Event Notifications for Student A
    logHeader('1. Server-controlled Notification Creation');

    // Direct service creation
    const notif1 = await notificationService.createNotification({
      recipientId: studentAId,
      actorId: recruiterId,
      type: NOTIFICATION_TYPE.SHORTLISTED,
      title: 'Shortlisted for Frontend Lead',
      message: 'You have been shortlisted by Acme Tech.',
      entityType: 'Application',
    });
    logPass(`Created notification 1: ${notif1._id}`);

    const notif2 = await notificationService.createNotification({
      recipientId: studentAId,
      actorId: recruiterId,
      type: NOTIFICATION_TYPE.INTERVIEW_SCHEDULED,
      title: 'Interview Scheduled',
      message: 'Your interview is set for tomorrow at 10 AM.',
      entityType: 'Application',
    });
    logPass(`Created notification 2: ${notif2._id}`);

    const notif3 = await notificationService.createNotification({
      recipientId: studentAId,
      type: NOTIFICATION_TYPE.SYSTEM,
      title: 'Welcome to VidyaLink Notifications',
      message: 'Explore your student dashboard.',
    });
    logPass(`Created notification 3: ${notif3._id}`);

    // Create a notification for Student B to test isolation
    const notifB = await notificationService.createNotification({
      recipientId: studentBId,
      type: NOTIFICATION_TYPE.PORTFOLIO_UPDATED,
      title: 'Student B Portfolio',
      message: 'Private to Student B.',
    });
    logPass(`Created notification for Student B: ${notifB._id}`);

    // 2. Fetch Notifications List & Unread Count
    logHeader('2. List Notifications & Unread Count');

    const listRes = await api('/notifications', { token: tokens.studentA });
    if (assert('GET /notifications (list all)', listRes, 200)) {
      const count = listRes.data?.data?.notifications?.length;
      if (count >= 3) {
        logPass(`Fetched ${count} notifications for Student A`);
      } else {
        logFail(`Expected at least 3 notifications, got ${count}`);
      }
    }

    const unreadCountRes = await api('/notifications/unread-count', { token: tokens.studentA });
    if (assert('GET /notifications/unread-count', unreadCountRes, 200)) {
      const unread = unreadCountRes.data?.data?.unreadCount;
      if (unread >= 3) {
        logPass(`Unread count accurately reflects unread items: ${unread}`);
      } else {
        logFail(`Expected at least 3 unread, got ${unread}`);
      }
    }

    const unreadListRes = await api('/notifications/unread', { token: tokens.studentA });
    assert('GET /notifications/unread', unreadListRes, 200);

    // 3. Filter by Type and isRead
    logHeader('3. Filtering & Pagination');

    const typeFilterRes = await api('/notifications?type=SHORTLISTED', { token: tokens.studentA });
    if (assert('GET /notifications?type=SHORTLISTED', typeFilterRes, 200)) {
      const allShortlisted = typeFilterRes.data?.data?.notifications?.every(
        (n) => n.type === 'SHORTLISTED'
      );
      if (allShortlisted) {
        logPass('Filtered correctly by type=SHORTLISTED');
      } else {
        logFail('Type filtering failed');
      }
    }

    const paginationRes = await api('/notifications?page=1&limit=2', { token: tokens.studentA });
    if (assert('GET /notifications?page=1&limit=2 (pagination)', paginationRes, 200)) {
      const pagination = paginationRes.data?.data?.pagination;
      if (pagination?.page === 1 && pagination?.limit === 2 && pagination?.totalPages >= 2) {
        logPass(`Pagination metadata verified: ${JSON.stringify(pagination)}`);
      } else {
        logFail('Pagination metadata incomplete', JSON.stringify(pagination));
      }
    }

    // 4. Mark Single as Read
    logHeader('4. Mark Single Notification as Read');

    const markReadRes = await api(`/notifications/${notif1._id}/read`, {
      method: 'PATCH',
      token: tokens.studentA,
    });
    if (assert('PATCH /notifications/:id/read', markReadRes, 200)) {
      const isRead = markReadRes.data?.data?.notification?.isRead;
      if (isRead === true) {
        logPass('Notification isRead set to true');
      } else {
        logFail('Notification isRead was not updated');
      }
    }

    // 5. Mark All as Read
    logHeader('5. Mark All Notifications as Read');

    const markAllRes = await api('/notifications/read-all', {
      method: 'PATCH',
      token: tokens.studentA,
    });
    if (assert('PATCH /notifications/read-all', markAllRes, 200)) {
      const updatedCount = markAllRes.data?.data?.modifiedCount;
      logPass(`Marked ${updatedCount} remaining notifications as read`);
    }

    // Verify unread count is now 0
    const countAfterReadAll = await api('/notifications/unread-count', { token: tokens.studentA });
    if (countAfterReadAll.data?.data?.unreadCount === 0) {
      logPass('Unread count is now 0 after markAllAsRead');
    } else {
      logFail(`Unread count should be 0, got ${countAfterReadAll.data?.data?.unreadCount}`);
    }

    // 6. Delete Single Notification
    logHeader('6. Delete Single Notification');

    const deleteSingleRes = await api(`/notifications/${notif1._id}`, {
      method: 'DELETE',
      token: tokens.studentA,
    });
    assert('DELETE /notifications/:id', deleteSingleRes, 200);

    // Verify deleting already deleted returns 404
    const deleteAgainRes = await api(`/notifications/${notif1._id}`, {
      method: 'DELETE',
      token: tokens.studentA,
    });
    assert('DELETE /notifications/:id (already deleted → 404)', deleteAgainRes, 404);

    // 7. Security & Cross-user Isolation
    logHeader('7. Security & User Isolation');

    // Student A attempts to access Student B's notification -> 404
    const crossUserReadRes = await api(`/notifications/${notifB._id}/read`, {
      method: 'PATCH',
      token: tokens.studentA,
    });
    assert('PATCH /notifications/:id/read (other user notification → 404/denied)', crossUserReadRes, 404);

    const crossUserDeleteRes = await api(`/notifications/${notifB._id}`, {
      method: 'DELETE',
      token: tokens.studentA,
    });
    assert('DELETE /notifications/:id (other user notification → 404/denied)', crossUserDeleteRes, 404);

    // Unauthenticated request -> 401
    const unauthRes = await api('/notifications');
    assert('GET /notifications (unauthenticated → 401)', unauthRes, 401);

    // Invalid ObjectId format -> 400
    const invalidIdRes = await api('/notifications/invalid-mongo-id-123/read', {
      method: 'PATCH',
      token: tokens.studentA,
    });
    assert('PATCH /notifications/:id/read (invalid ObjectId → 400)', invalidIdRes, 400);

    // 8. Event Service Dispatches
    logHeader('8. Notification Events Dispatcher Integration');

    const eventResult = await notificationEventsService.notifyInterviewScheduled({
      studentId: studentAId,
      recruiterId,
      recruiterName: 'Acme Recruiter',
      projectTitle: 'Backend Architecture Sprint',
      interviewDate: new Date(Date.now() + 86400000),
      interviewMode: 'Online',
    });

    if (eventResult && eventResult._id) {
      logPass(`Event successfully created notification: ${eventResult._id}`);
      // Verify student receives it
      const studentAList = await api('/notifications', { token: tokens.studentA });
      const found = studentAList.data?.data?.notifications?.some(
        (n) => n._id === eventResult._id.toString()
      );
      if (found) {
        logPass('Event notification delivered and visible in recipient inbox');
      } else {
        logFail('Event notification was not found in recipient inbox');
      }
    } else {
      logFail('Event notification dispatch returned null');
    }

    // 9. Delete All Notifications
    logHeader('9. Delete All Notifications for User');

    const deleteAllRes = await api('/notifications', {
      method: 'DELETE',
      token: tokens.studentA,
    });
    assert('DELETE /notifications (delete all)', deleteAllRes, 200);

    const listAfterDelete = await api('/notifications', { token: tokens.studentA });
    if (listAfterDelete.data?.data?.notifications?.length === 0) {
      logPass('Inbox completely cleared for Student A');
    } else {
      logFail('Inbox was not empty after deleteAllNotifications');
    }

    // Verify Student B's notification is still intact
    const studentBList = await api('/notifications', { token: tokens.studentB });
    if (studentBList.data?.data?.notifications?.length >= 1) {
      logPass("Student B's notifications remained completely unaffected");
    } else {
      logFail("Student B's notifications were incorrectly affected");
    }

    // ── Summary ─────────────────────────────────────────────────────────────

    logHeader('TEST RESULTS SUMMARY');
    console.log(`${C.bright}Passed: ${C.green}${passed}${C.reset}`);
    console.log(`${C.bright}Failed: ${C.red}${failed}${C.reset}`);

    if (failed > 0) {
      console.log(`\n${C.red}${C.bright}${failed} test(s) failed.${C.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${C.green}${C.bright}All ${passed} notification backend tests passed!${C.reset}\n`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error(`${C.red}Fatal error during notification tests:${C.reset}`, err);
  process.exit(1);
});
