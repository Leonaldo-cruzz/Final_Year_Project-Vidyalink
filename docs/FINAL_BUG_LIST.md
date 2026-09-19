# VIDYALINK — Final Functional Bug List

**Audit Date:** September 14, 2026  
**Last Updated:** September 15, 2026  
**Auditor:** Antigravity Functional Audit Subsystem  
**Scope:** Complete Codebase (FastAPI AI Service, Express Backend, React Frontend)

---

## Bug Classification Summary

| Severity | Total | Fixed | Open (Tracked) |
|---|---|---|---|
| **CRITICAL** | 0 | 0 | 0 |
| **HIGH** | 1 | 1 | 0 |
| **MEDIUM** | 5 | 5 | 0 |
| **LOW** | 9 | 9 | 0 |
| **Total** | **15** | **15** | **0** |

---

## 1. Resolved Bugs

### BUG-01: Rejection Handling Failure in AI Insights Page
- **Severity:** HIGH
- **Description:** When `getAIResults()` failed or the network was down, `Promise.allSettled` in `loadResults()` produced a rejected status (`aiRes.status === 'rejected'`). However, the code only checked `aiRes.status === 'fulfilled'` and did not handle the rejected case. Because `Promise.allSettled` does not throw, the `try...catch` block never activated, leaving `error: ''` and leaving the page in an empty/blank state instead of presenting the accessible error alert banner.
- **Affected Role:** Student
- **Affected Route:** `/ai-insights`
- **Fix Status:** **RESOLVED**. Handled `else if (aiRes.status === 'rejected')` in `AIInsights.jsx`, setting error state properly.

---

### BUG-02: Text Query Collisions in AIInsightsPanelStates Vitest Suite
- **Severity:** MEDIUM
- **Description:** Four test cases in `AIInsightsPanelStates.test.jsx` failed due to React Testing Library's `getByText` encountering multiple elements matching identical score numbers and banner strings.
- **Affected Role:** Student (Test Environment)
- **Affected Route:** `/ai-insights`
- **Fix Status:** **RESOLVED**. Differentiated fixture values (`readiness_score: 82`, `education_score: 85`) and updated regex assertions to `getAllByText`. All 10 tests now pass.

---

### BUG-03: Dead Navigation Links in Faculty, Recruiter, and Alumni Sidebar Navigation
- **Severity:** MEDIUM
- **Description:** `NAV_ITEMS` in `client/src/constants/index.js` included `{ label: 'Projects', path: '/projects' }` for Faculty and Recruiter roles. However, `/projects` is restricted by `ProtectedRoute` to students only on the frontend, and by `authorize('student')` in `project.routes.js` on the backend. Clicking this link resulted in a 403 Forbidden / Access Denied page for faculty and recruiters. Similarly, Alumni had `{ label: 'Workspaces', path: '/workspaces' }` in their nav despite having no workspace records.
- **Affected Role:** Faculty, Recruiter, Alumni, Admin
- **Affected Route:** `/projects`, `/workspaces`
- **Fix Status:** **RESOLVED**. Pruned dead links from `NAV_ITEMS[ROLES.FACULTY]`, `NAV_ITEMS[ROLES.RECRUITER]`, `NAV_ITEMS[ROLES.ALUMNI]`, and `NAV_ITEMS[ROLES.ADMIN]`.

---

### BUG-04: Notifications System Lacks Backend Persistence Model
- **Severity:** MEDIUM
- **Description:** The application's top navigation bar (`Topbar.jsx`) contained a notification bell icon that displayed a static placeholder. No `Notification` Mongoose model, database collection, or `/api/v1/notifications` REST endpoint existed on the server.
- **Affected Role:** All roles (Student, Faculty, Recruiter, Alumni, Admin)
- **Affected Route:** All authenticated dashboard routes
- **Fix Status:** **RESOLVED**.
  1. Created `Notification` schema (`server/src/models/notification.model.js`) with recipient indexing, event classification, unread tracking, and link metadata.
  2. Created `NotificationService` and `NotificationController` with routes for `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/mark-all-read`, and `GET /notifications/unread-count`.
  3. Wired asynchronous notification dispatch across milestone submissions, faculty verifications, recruitment application status transitions (under review, shortlisted, interview scheduled, selected), and mentorship engagements.
  4. Created client-side `notificationService.js` and wired `Topbar.jsx` with real unread counts, notification list rendering, and mark-as-read interaction.
  5. Verified via automated unit tests `TC-NOTIF1` and `TC-NOTIF2` in `server/test/gap_closure.test.js`.

---

### BUG-05: Password Recovery / Reset Endpoint Not Implemented
- **Severity:** LOW
- **Description:** The `/forgot-password` route rendered an honest placeholder stating that the reset endpoint was not exposed by the backend. No password reset token generation or credential reset controller existed.
- **Affected Role:** All roles (Unauthenticated users)
- **Affected Route:** `/forgot-password`, `/reset-password`
- **Fix Status:** **RESOLVED**.
  1. Added `passwordResetToken` and `passwordResetExpires` fields to `User` schema.
  2. Implemented `forgotPassword` in `auth.service.js` with SHA-256 token hashing and 1-hour expiration timestamp.
  3. Implemented `resetPassword` in `auth.service.js` verifying the token hash and securely updating the user's password.
  4. Added `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password` endpoints with input validation.
  5. Built functional `ForgotPassword.jsx` page and interactive `ResetPassword.jsx` page wired to `ROUTES.RESET_PASSWORD`.
  6. Verified via automated unit tests `TC-AUTH-RESET1` and `TC-AUTH-RESET2` in `server/test/gap_closure.test.js`.

---

### BUG-06: Alumni Mentorship & Referral Lifecycle In-Memory Only
- **Severity:** LOW
- **Description:** The `AlumniDashboard.jsx` interface allowed alumni to view mentorship requests, schedule calls, and post campus referrals, but actions modified local React component state (`useState`) and did not persist to MongoDB collections.
- **Affected Role:** Alumni, Student
- **Affected Route:** `/dashboard/alumni`, `/ai-insights`
- **Fix Status:** **RESOLVED**.
  1. Created `Mentorship` and `Referral` schemas (`server/src/models/mentorship.model.js`, `server/src/models/referral.model.js`).
  2. Created `mentorship.service.js` and `referral.service.js` with complete CRUD, filtering, and role checks.
  3. Exposed REST endpoints at `/api/v1/mentorship` and `/api/v1/referrals`.
  4. Built client services `mentorshipService.js` and `referralService.js`.
  5. Upgraded `AlumniDashboard.jsx` to load and mutate real backend data, supporting accept, schedule, decline, and referral creation.
  6. Connected `AIInsights.jsx` with an interactive "Request Mentorship" modal allowing students to initiate mentorship requests directly to recommended alumni.
  7. Verified via automated unit tests `TC-MENT1`, `TC-MENT2`, and `TC-REF1` in `server/test/gap_closure.test.js`.

---

## 2. Open Items
*Zero open bugs remaining. 100% of tracked functional issues resolved.*

---

## 3. Master Final Sprint Additions (September 15, 2026)

The following additional issues were identified and resolved during the Master Final Functional Completion Sprint:

### BUG-07: Live Deployment URL Field Never Validated for Reachability
- **Severity:** MEDIUM
- **Description:** The `Project.liveDeployment` URL field was stored and displayed but never checked for actual HTTP reachability. The synopsis explicitly required `checking / reachable / unreachable / verification failed` states.
- **Affected Role:** Student
- **Affected Route:** `/projects/:projectId` (ProjectDetails)
- **Fix Status:** **RESOLVED.**
  1. Added `deploymentStatus` field to `Project` model with 5-state enum: `not_provided`, `pending`, `reachable`, `unreachable`, `failed`.
  2. Implemented `verifyDeployment()` in `project.service.js` — real HTTP HEAD request with 8s timeout via native `fetch`.
  3. Added `POST /api/v1/projects/:id/verify-deployment` route.
  4. Added `verifyDeployment()` to client `projectService.js`.
  5. Added deployment status badge to `ProjectCard.jsx`.
  6. Added "Live Deployment Verification" section with [Check Deployment] button and 5-state display to `ProjectDetails.jsx`.

---

### BUG-08: Legacy "Workspaces" Link in Student Sidebar Navigation
- **Severity:** LOW
- **Description:** `NAV_ITEMS[ROLES.STUDENT]` included `{ label: 'Workspaces', path: '/workspaces' }`. Workspaces are a back-channel recruiter hand-off mechanism, not a primary student navigation destination. This caused confusion in the student's primary navigation rail.
- **Affected Role:** Student
- **Affected Route:** Student sidebar navigation
- **Fix Status:** **RESOLVED.** Removed `Workspaces` from `NAV_ITEMS[ROLES.STUDENT]` in `client/src/constants/index.js`. Backend workspace routes and pages remain intact.

---

### BUG-09: RecruiterDashboard Silent Error on Network Failure
- **Severity:** LOW
- **Description:** The `catch {}` block in `RecruiterDashboard.jsx` silently swallowed network errors, leaving the UI in an ambiguous blank/loading state instead of showing a user-actionable error message.
- **Affected Role:** Recruiter
- **Affected Route:** `/dashboard/recruiter`
- **Fix Status:** **RESOLVED.** Added `loadError` state; catch block sets error message surfaced as `role="alert"` error banner.

---

### BUG-10: Missing aria-live on Toast/Notice Banners
- **Severity:** LOW
- **Description:** Success toast banners in `RecruiterDashboard.jsx`, `AlumniDashboard.jsx`, `AdminDashboard.jsx`, and `GithubIntegration.jsx` had no `role` attribute or `aria-live` region, making them invisible to screen readers.
- **Affected Role:** All roles
- **Affected Route:** Multiple dashboard routes
- **Fix Status:** **RESOLVED.** Added `role="status" aria-live="polite"` to all success toast banners. Error banners use `role="alert"` (already implicit for screen readers but now explicit).


---

## 4. Recruitment & Alumni Completion Sprint (September 16, 2026)

### BUG-11: Admin Stats Missing Mentorship/Referral/Interview Counts
- **Severity:** MEDIUM
- **Description:** GET /api/v1/admin/stats returned only 4 metrics (users, projects, portfolios, applications). The synopsis required visibility into mentorship, referral, and interview pipeline data for admin governance.
- **Affected Role:** Admin
- **Affected Route:** /dashboard/admin
- **Fix Status:** **RESOLVED.**
  1. Added Mentorship.countDocuments(), Referral.countDocuments(), and Application.countDocuments({ status: 'Interview Scheduled' }) to the admin stats aggregation.
  2. Added 	otalMentorships, 	otalReferrals, 	otalInterviews to the stats response.
  3. AdminDashboard.jsx now renders 7 stat cards in a responsive grid.

---

### BUG-12: Admin User List Unbounded (No Pagination)
- **Severity:** MEDIUM
- **Description:** GET /api/v1/admin/users returned all users in a single MongoDB query with no limit, skip, or pagination. For large institutional deployments this would load thousands of records into the browser.
- **Affected Role:** Admin
- **Affected Route:** /dashboard/admin
- **Fix Status:** **RESOLVED.**
  1. Added page, limit (default 50, max 200), ole, search query params to getAdminUsers.
  2. Response now returns { users, total, page, totalPages }.
  3. AdminDashboard.jsx correctly reads esData.users from the paginated response (with fallback for direct array format).

---

### BUG-13: RecruiterDashboard N+1 Application Fetch
- **Severity:** LOW
- **Description:** RecruiterDashboard.jsx fetched the recruiter's projects first, then made one GET /applications/project/:id request per project in Promise.allSettled. With N projects this produces N+1 total HTTP requests on dashboard load.
- **Affected Role:** Recruiter
- **Affected Route:** /dashboard/recruiter
- **Fix Status:** **RESOLVED.**
  1. Added GET /api/v1/applications/recruiter endpoint that does a single aggregated query across all the recruiter's projects (joins portfolio and AI evaluation in a single pass).
  2. Added getRecruiterApplications() to client/src/services/applicationService.js.
  3. RecruiterDashboard.jsx now makes 2 parallel calls instead of N+1.

---

## 5. Final Product Acceptance & Zero-Gap Closure (September 16, 2026)

### BUG-14: Legacy Freelance/Marketplace Terminology in Student Applications Empty State
- **Severity:** LOW
- **Description:** `StudentApplications.jsx` contained the copy "Browse the live project marketplace and apply for opportunities that match your skills." In VidyaLink, students apply to recruiter-posted opportunities, not a freelance marketplace.
- **Affected Role:** Student
- **Affected Route:** `/applications`
- **Fix Status:** **RESOLVED.** Updated copy to "Browse available project opportunities and apply for roles that match your skills." eliminating legacy marketplace connotations.

---

### BUG-15: Resume Text Extraction in buildPortfolioPayload Bypassed Stored rawText
- **Severity:** LOW
- **Description:** In `server/src/services/aiIntegration.service.js`, `buildPortfolioPayload()` directly called `await extractResumeText(context.resume)` from disk, whereas `analyzeATS()` checked `context.resume?.rawText` first. If the file was DOCX or disk I/O was slow, this could cause redundant disk operations or parsing discrepancies.
- **Affected Role:** Student
- **Affected Route:** `/api/v1/ai/portfolio/evaluate`
- **Fix Status:** **RESOLVED.** Updated `buildPortfolioPayload()` to use `context.resume?.rawText || await extractResumeText(context.resume)`, ensuring stored parsed text from MongoDB is reused with zero redundant disk reads.

