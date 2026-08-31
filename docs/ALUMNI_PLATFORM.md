# VIDYALINK — Alumni Platform Documentation

## Overview

The Alumni Platform is a fully integrated ecosystem within VIDYALINK that enables verified alumni to discover students, provide mentorship, endorse skills, conduct mock interviews, submit referrals, and track impact via a real-time dashboard.

---

## Table of Contents

1. Architecture Overview
2. RBAC Permissions
3. API Reference
4. Lifecycle State Machines
5. Notification Triggers
6. Privacy and Security Rules
7. Frontend Routes and Pages

---

## 1. Architecture Overview

### Data Models

| Model | File | Purpose |
|-------|------|---------|
| AlumniProfile | server/src/models/alumniProfile.model.js | Company, designation, skills, availability toggles |
| Mentorship | server/src/models/mentorship.model.js | Request/accept/complete lifecycle |
| Endorsement | server/src/models/endorsement.model.js | Alumni endorsements with compound unique index |
| MockInterview | server/src/models/mockInterview.model.js | Scheduling and rubric-based feedback |
| Referral | server/src/models/referral.model.js | 6-state referral tracking lifecycle |
| Notification | server/src/models/notification.model.js | In-app notifications with read status |

### Service Layer

server/src/services/alumni.service.js — Central business logic handling:
- Alumni profile CRUD with index syncing
- Student discovery with skill-based cross-collection filtering
- Portfolio view with AI Industry Readiness score calculation
- Mentorship full lifecycle
- Skill endorsements with duplicate prevention via compound unique index
- Mock interview scheduling, completion with rubric feedback
- Referral creation and status transitions
- Dashboard stats aggregation

---

## 2. RBAC Permissions

| Action | Alumni | Student | Recruiter | Faculty |
|--------|--------|---------|-----------|---------|
| GET /alumni/profile | YES (own) | NO | NO | NO |
| PATCH /alumni/profile | YES (own) | NO | NO | NO |
| GET /alumni/students | YES | NO | NO | NO |
| GET /alumni/students/:id | YES | NO | NO | NO |
| POST /alumni/mentorship/requests | NO | YES (initiates) | NO | NO |
| GET /alumni/mentorship/requests | YES (own) | YES (own) | NO | NO |
| PATCH .../accept / reject / complete | YES | NO | NO | NO |
| POST /alumni/endorsements | YES | NO | NO | NO |
| GET /alumni/endorsements | YES | YES | NO | NO |
| POST /alumni/mock-interviews | NO | YES (initiates) | NO | NO |
| PATCH .../schedule / complete | YES | NO | NO | NO |
| POST /alumni/referrals | YES | NO | NO | NO |
| PATCH /alumni/referrals/:id | YES (own) | NO | NO | NO |
| GET /alumni/dashboard/stats | YES | NO | NO | NO |
| GET /notifications | YES | YES | YES | YES |
| PATCH /notifications/:id/read | YES | YES | YES | YES |

---

## 3. API Reference

All endpoints are prefixed with /api/v1.

### 3.1 Alumni Profile

GET /alumni/profile — Get or initialise the authenticated alumni profile.
PATCH /alumni/profile — Update profile fields (all optional).

Body fields: company, designation, industry, experience, skills[], bio, location, linkedin, github, companyWebsite, mentorshipAvailable, mockInterviewsAvailable, referralsAvailable.

### 3.2 Student Discovery

GET /alumni/students — Paginated student list with verification status.

Query params: search, skills (comma-separated), branch, graduationYear, page, limit.
Skill filtering cross-queries Profile, StudentProfile, and Portfolio collections.
No password or token fields are ever returned.

### 3.3 Student Portfolio View

GET /alumni/students/:studentId — Detailed public portfolio.

Returns:
- student: public fields only
- portfolios[]: verified certificates
- industryReadiness: { score, level, breakdown }

### 3.4 Mentorship

POST /alumni/mentorship/requests (Student) — body: alumniId, topic, message, goals[]
GET /alumni/mentorship/requests — list (alumni sees all incoming, student sees own)
PATCH /alumni/mentorship/requests/:id/accept (Alumni) — body: notes
PATCH /alumni/mentorship/requests/:id/reject (Alumni) — body: notes
PATCH /alumni/mentorship/requests/:id/complete (Alumni) — body: notes, feedback{ rating, comment }

### 3.5 Skill Endorsements

POST /alumni/endorsements (Alumni) — body: studentId, skill, message
GET /alumni/endorsements — query: studentId, page, limit
Duplicate prevention: compound unique index { student, alumni, skill } ? HTTP 409.

### 3.6 Mock Interviews

POST /alumni/mock-interviews (Student) — body: alumniId, roleTarget, mode, scheduledDate, durationMinutes, notes
PATCH /alumni/mock-interviews/:id/schedule (Alumni) — body: scheduledDate, mode, meetingLink, location, durationMinutes
PATCH /alumni/mock-interviews/:id/complete (Alumni) — body: feedback{ rating, technicalSkills, communication, strengths[], improvements[], detailedSummary }

### 3.7 Referrals

POST /alumni/referrals (Alumni) — body: studentId, company, jobTitle, jobUrl, message, status
PATCH /alumni/referrals/:id (Alumni) — partial update including status transitions

### 3.8 Dashboard

GET /alumni/dashboard/stats (Alumni) — returns:
{ studentsMentored, endorsementsGiven, mockInterviewsConducted, activeReferrals, pendingMentorshipRequests, pendingMockInterviews }

### 3.9 Notifications

GET /notifications — paginated list, includes unreadCount
PATCH /notifications/:id/read — marks notification as read

---

## 4. Lifecycle State Machines

### Mentorship
PENDING ? ACCEPTED ? COMPLETED
PENDING ? REJECTED

### Mock Interview
REQUESTED ? SCHEDULED ? COMPLETED
REQUESTED ? REJECTED
REQUESTED ? CANCELLED
SCHEDULED ? CANCELLED

### Referral
DRAFT ? SUBMITTED ? UNDER_REVIEW ? REFERRED ? CLOSED
SUBMITTED ? REJECTED

---

## 5. Notification Triggers

| Event | Recipient | Message |
|-------|-----------|---------|
| Student creates mentorship request | Alumni | New mentorship request from {student} |
| Alumni accepts mentorship | Student | Mentorship request accepted by {alumni} |
| Alumni rejects mentorship | Student | Mentorship request not accepted by {alumni} |
| Alumni completes mentorship | Student | Mentorship session with {alumni} complete |
| Alumni endorses skill | Student | {alumni} endorsed your {skill} skill |
| Student requests mock interview | Alumni | New mock interview request from {student} |
| Alumni schedules interview | Student | Mock interview scheduled by {alumni} |
| Alumni completes interview | Student | Interview feedback ready from {alumni} |
| Alumni creates referral | Student | Referred to {company} for {jobTitle} |
| Referral status changes | Student | Referral to {company} is now {status} |

---

## 6. Privacy and Security Rules

1. No credential leakage — password, refreshToken, resetPasswordToken never returned.
2. Portfolio privacy — getStudentPortfolio uses positive select() projection for public fields only.
3. Role enforcement — authorize() middleware returns 403 on cross-role access.
4. Duplicate endorsement prevention — MongoDB compound unique index.
5. Ownership checks — Referral updates and mentorship actions verify ownership.
6. Input validation — Zod schemas via validate middleware; 400 with field-level errors on failure.

---

## 7. Frontend Routes and Pages

| Route | Component | Access |
|-------|-----------|--------|
| /alumni/profile | AlumniProfile.jsx | Alumni |
| /alumni/students | StudentDiscovery.jsx | Alumni |
| /alumni/students/:studentId | StudentPortfolioView.jsx | Alumni |
| /alumni/mentorship | MentorshipRequests.jsx | Alumni |
| /alumni/endorsements | EndorsementList.jsx | Alumni |
| /alumni/mock-interviews | MockInterviewRequests.jsx | Alumni |
| /alumni/referrals | Referrals.jsx | Alumni |
| /dashboard/alumni | AlumniDashboard.jsx | Alumni |

### Modals
- MentorshipRequestModal.jsx — Initiate mentorship from student portfolio
- MentorshipDetailsModal.jsx — View / accept / complete mentorship
- EndorseSkillModal.jsx — Submit skill endorsement
- ScheduleMockInterviewModal.jsx — Schedule interview slot
- MockInterviewDetailsModal.jsx — View rubric feedback
- CreateReferralModal.jsx — Create referral for student
- ReferralDetailsModal.jsx — Update referral status

### Topbar Notifications
Polls /api/v1/notifications every 30 seconds.
Displays unread badge count and dropdown with clickable notification items.
