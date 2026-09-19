# VIDYALINK — Final Test Matrix

**Document Date:** September 15, 2026  
**Scope:** Complete feature coverage for VidyaLink (Student, Faculty, Recruiter, Alumni, Admin)  
**Test Methodology:** Automated (Vitest / Node `--test` / pytest) + Manual browser verification

---

## Test Matrix

| # | Feature | Role | Scenario | Expected Behavior | Actual Behavior | Test Result |
|---|---|---|---|---|---|---|
| **AUTH-01** | Registration | Any | Register with valid email + strong password + role | Account created, JWT cookie set, redirects to dashboard | ✅ As expected | ✅ PASS |
| **AUTH-02** | Registration | Any | Register with duplicate email | HTTP 409 Conflict — "Email already in use" | ✅ As expected | ✅ PASS |
| **AUTH-03** | Login | Any | Valid credentials | JWT cookie set, user data returned, redirects to role dashboard | ✅ As expected | ✅ PASS |
| **AUTH-04** | Login | Any | Invalid password | HTTP 401 Unauthorized — generic error (no credential hint) | ✅ As expected | ✅ PASS |
| **AUTH-05** | Session Restore | Any | Refresh browser while logged in | `GET /auth/me` restores session, no "Verifying session…" hang | ✅ As expected | ✅ PASS |
| **AUTH-06** | Token Refresh | Any | Access token expires; user still on page | Auto-refresh via interceptor, user stays logged in | ✅ As expected | ✅ PASS |
| **AUTH-07** | Logout | Any | Click Sign Out | Cookie cleared, redirect to `/login` | ✅ As expected | ✅ PASS |
| **AUTH-08** | Protected Route | Unauthenticated | Navigate to `/dashboard/student` | Redirect to `/login` | ✅ As expected | ✅ PASS |
| **AUTH-09** | RBAC | Faculty | Access `/dashboard/student` | HTTP 403 Forbidden / redirect | ✅ As expected | ✅ PASS |
| **AUTH-10** | Forgot Password | Any | Submit valid email | SHA-256 token + 1h expiry written to DB; success message shown | ✅ As expected | ✅ PASS |
| **AUTH-11** | Reset Password | Any | Valid token + new password | Password updated, token invalidated | ✅ As expected | ✅ PASS |
| **AUTH-12** | Reset Password | Any | Expired / invalid token | HTTP 400 — "Invalid or expired reset token" | ✅ As expected | ✅ PASS |
| **PROF-01** | Profile CRUD | Student | Create/update profile fields | All fields persist to MongoDB `Profile` collection | ✅ As expected | ✅ PASS |
| **PROF-02** | Profile Ownership | Student | Attempt to update another student's profile | HTTP 403 Forbidden | ✅ As expected | ✅ PASS |
| **PROF-03** | Profile Photo | Student | Upload valid JPEG avatar | Stored in `/uploads`, URL saved on profile | ✅ As expected | ✅ PASS |
| **PROJ-01** | Create Project | Student | Submit form with required fields | Project created with `verificationStatus: Pending` | ✅ As expected | ✅ PASS |
| **PROJ-02** | Projects Empty State | Student | 0 projects | Shows "Your portfolio is empty" + "Create your first project" | ✅ As expected | ✅ PASS |
| **PROJ-03** | Projects List | Student | 1+ projects | Shows actual project grid, no fake entries | ✅ As expected | ✅ PASS |
| **PROJ-04** | Project Delete | Student | Delete own project | Project removed from DB and screenshots purged | ✅ As expected | ✅ PASS |
| **PROJ-05** | Project Search | Student | Search by tech/title | Filtered results returned | ✅ As expected | ✅ PASS |
| **PROJ-06** | Live Deployment Verify | Student | Project with `liveDeployment` URL → Check Deployment | HEAD request made; status = reachable/unreachable/failed | ✅ As expected | ✅ PASS |
| **PROJ-07** | Live Deployment Verify | Student | Project with no `liveDeployment` URL → Check Deployment | Status set to `not_provided` | ✅ As expected | ✅ PASS |
| **PROJ-08** | Live Deployment Verify | Student | Project with malformed URL | Status set to `failed` without crash | ✅ As expected | ✅ PASS |
| **CERT-01** | Upload Certificate | Student | Upload PDF ≤5MB | Certificate record created, file stored | ✅ As expected | ✅ PASS |
| **CERT-02** | Upload Certificate | Student | Upload file >5MB | HTTP 400 — file size exceeded | ✅ As expected | ✅ PASS |
| **CERT-03** | Delete Certificate | Student | Delete own certificate | Certificate removed from DB | ✅ As expected | ✅ PASS |
| **CERT-04** | Cert Ownership | Student | Access another student's certificate | HTTP 403 Forbidden | ✅ As expected | ✅ PASS |
| **RES-01** | Resume Generate | Student | Click "Generate Resume" with real profile | ATS-safe PDF created from actual DB data | ✅ As expected | ✅ PASS |
| **RES-02** | Resume Upload | Student | Upload valid PDF | Stored in `/uploads`, resume record created | ✅ As expected | ✅ PASS |
| **RES-03** | Resume ATS | Student | Run ATS analysis on generated resume | Returns score 0-100, keywords, suggestions from FastAPI | ✅ As expected | ✅ PASS |
| **RES-04** | Resume Stale | Student | Update profile after generating resume | Stale banner shown: "Profile changed since last generation" | ✅ As expected | ✅ PASS |
| **RES-05** | Resume No Fake | Student | Generated resume text | No placeholder strings, no fake names | ✅ As expected | ✅ PASS |
| **GH-01** | GitHub Connect | Student | Submit valid GitHub username | Profile snapshot fetched from real GitHub API, stored in DB | ✅ As expected | ✅ PASS |
| **GH-02** | GitHub Sync | Student | Click Sync | Live GitHub API re-fetched, snapshot updated | ✅ As expected | ✅ PASS |
| **GH-03** | GitHub Disconnect | Student | Click Disconnect | `connectionStatus` set to `Disconnected`; snapshot preserved | ✅ As expected | ✅ PASS |
| **GH-04** | GitHub 404 | Student | Invalid username | HTTP 404 — "GitHub username was not found" | ✅ As expected | ✅ PASS |
| **GH-05** | GitHub Rate Limit | Student | GitHub API 403/429 | HTTP 429 — "GitHub rate limit reached" | ✅ As expected | ✅ PASS |
| **PORT-01** | Private Portfolio | Student | Navigate to `/portfolio/me` with 0 verified portfolios | Access gate shown — verification required | ✅ As expected | ✅ PASS |
| **PORT-02** | Private Portfolio | Student | Navigate to `/portfolio/me` with verified portfolio | Portfolio displayed with cryptographic hash | ✅ As expected | ✅ PASS |
| **PORT-03** | Public Cert Verify | Anyone | Navigate to `/portfolio/verify/:certificateId` | Certificate details shown without login | ✅ As expected | ✅ PASS |
| **PORT-04** | Certificate Share | Student | Click Copy Share Link | URL copied to clipboard in format `/portfolio/verify/VLC-YYYY-XXXX` | ✅ As expected | ✅ PASS |
| **VERIF-01** | No Projects | Student | Dashboard with 0 projects | CTA: [Add Project]. No "Verified Portfolio" button. | ✅ As expected | ✅ PASS |
| **VERIF-02** | Submit | Student | Student has eligible project → Submit | `Verification` record created with `PENDING` status | ✅ As expected | ✅ PASS |
| **VERIF-03** | Duplicate Submit | Student | Submit while PENDING | HTTP 409 — duplicate pending submission prevented | ✅ As expected | ✅ PASS |
| **VERIF-04** | Changes Requested | Faculty → Student | Faculty requests changes with remarks | Student sees "Changes Requested" with faculty remarks | ✅ As expected | ✅ PASS |
| **VERIF-05** | Rejected | Faculty → Student | Faculty rejects with remarks | Student sees "Verification Rejected" + remarks | ✅ As expected | ✅ PASS |
| **VERIF-06** | Approved | Faculty → Student | Faculty approves | `Portfolio` record created with SHA-256 hash, project marked Verified, student notified | ✅ As expected | ✅ PASS |
| **VERIF-07** | Verified CTA | Student | After faculty approval | "Verified Portfolio" CTA appears for first time | ✅ As expected | ✅ PASS |
| **VERIF-08** | Faculty Queue | Faculty | Login and view verification queue | All pending submissions listed with student name, project, submitted date | ✅ As expected | ✅ PASS |
| **VERIF-09** | AI Gate | Student | Access AI Insights before verification | Gated: "Complete faculty verification before running AI evaluation." | ✅ As expected | ✅ PASS |
| **AI-01** | Portfolio Score | Student | Run AI evaluation (verified student) | Returns overall score, 6 component scores, strengths, improvements | ✅ As expected | ✅ PASS |
| **AI-02** | Score No Fake | Student | AI evaluation result | No hardcoded/random numbers; deterministic from real evidence | ✅ As expected | ✅ PASS |
| **AI-03** | Stale Detection | Student | Update project after AI evaluation | Status changes to STALE, banner shown, [Re-evaluate] available | ✅ As expected | ✅ PASS |
| **AI-04** | ATS Analysis | Student | Upload resume + run ATS | Score, keyword match, missing keywords returned from FastAPI | ✅ As expected | ✅ PASS |
| **AI-05** | Skill Extraction | Student | View skill gap tab | Extracted skills from profile/projects/resume shown | ✅ As expected | ✅ PASS |
| **AI-06** | Skill Gap | Student | Select target role (e.g., Backend Developer) | Missing skills vs. required skills shown with coverage % | ✅ As expected | ✅ PASS |
| **AI-07** | GitHub Analytics | Student | GitHub connected + AI evaluation | Factual metrics shown (repos, followers, commit activity) | ✅ As expected | ✅ PASS |
| **AI-08** | Industry Readiness | Student | AI evaluation result | Readiness score derived from real portfolio + ATS + GitHub signals | ✅ As expected | ✅ PASS |
| **AI-09** | Recommendations | Student | AI evaluation result | Real alumni + real opportunity records recommended (no fake entities) | ✅ As expected | ✅ PASS |
| **AI-10** | AI Partial | Student | Some evidence missing (no GitHub) | Partial evaluation shown, missing components listed honestly | ✅ As expected | ✅ PASS |
| **MEN-01** | Request Mentorship | Student → Alumni | Student clicks "Request Mentorship" on alumni card | `Mentorship` record created with status `PENDING` | ✅ As expected | ✅ PASS |
| **MEN-02** | Accept Mentorship | Alumni | Accept with schedule | Status → `ACCEPTED`, `scheduledDate` set, student notified | ✅ As expected | ✅ PASS |
| **MEN-03** | Decline Mentorship | Alumni | Decline request | Removed from pending queue | ✅ As expected | ✅ PASS |
| **REF-01** | Post Referral | Alumni | Submit company + role | `Referral` record created and persisted to DB | ✅ As expected | ✅ PASS |
| **REF-02** | View Referrals | Alumni | View My Referrals | Real referral list from DB shown | ✅ As expected | ✅ PASS |
| **REC-01** | Candidate Search | Recruiter | Search by name/skill | Filtered candidate list from DB | ✅ As expected | ✅ PASS |
| **REC-02** | Candidate Dossier | Recruiter | Click candidate | Verified portfolio, AI insights, resume, GitHub shown | ✅ As expected | ✅ PASS |
| **REC-03** | Post Opportunity | Recruiter | Create project as recruiter | Project created, eligible for student applications | ✅ As expected | ✅ PASS |
| **APP-01** | Apply | Student | Apply to recruiter project | `Application` record created with status `Applied` | ✅ As expected | ✅ PASS |
| **APP-02** | Under Review | Recruiter | Move application to Under Review | Status → `Under Review`, student notified | ✅ As expected | ✅ PASS |
| **APP-03** | Shortlist | Recruiter | Shortlist candidate | Status → `Shortlisted`, student notified | ✅ As expected | ✅ PASS |
| **APP-04** | Interview Schedule | Recruiter | Schedule interview with date/mode | Status → `Interview Scheduled`, student notified with details | ✅ As expected | ✅ PASS |
| **APP-05** | Select Candidate | Recruiter | Select candidate | Status → `Selected`, project → `in_progress`, Workspace provisioned, student notified | ✅ As expected | ✅ PASS |
| **APP-06** | Reject Candidate | Recruiter | Reject application | Status → `Rejected`, student notified | ✅ As expected | ✅ PASS |
| **APP-07** | Invalid Transition | Recruiter | Move from Selected → Applied | HTTP 400 — invalid state transition | ✅ As expected | ✅ PASS |
| **NOTIF-01** | Verification Approved | Student | Faculty approves | Notification: "Your project has been verified" | ✅ As expected | ✅ PASS |
| **NOTIF-02** | Application Status | Student | Status changes | Notification with updated status dispatched | ✅ As expected | ✅ PASS |
| **NOTIF-03** | Interview Scheduled | Student | Recruiter schedules interview | Notification with date and mode | ✅ As expected | ✅ PASS |
| **NOTIF-04** | Mentorship Request | Alumni | Student requests mentorship | Notification to alumni | ✅ As expected | ✅ PASS |
| **NOTIF-05** | Mark Read | Any | Click notification | Notification marked as read, unread count decrements | ✅ As expected | ✅ PASS |
| **ADMIN-01** | User List | Admin | View admin dashboard | Real user list from DB with role filters | ✅ As expected | ✅ PASS |
| **ADMIN-02** | Stats | Admin | View platform stats | Total users, active projects, verified portfolios, applications from real DB aggregations | ✅ As expected | ✅ PASS |
| **ADMIN-03** | User Status Toggle | Admin | Toggle user active/inactive | `User.status` updated in DB | ✅ As expected | ✅ PASS |
| **ADMIN-04** | AI Health | Admin | Click Refresh AI Health | Real ping to FastAPI `/health`; shows available/unavailable | ✅ As expected | ✅ PASS |
| **RESP-01** | Responsive | Any | 375px viewport | No horizontal overflow, readable navigation | ✅ As expected | ✅ PASS |
| **RESP-02** | Responsive | Any | 768px viewport | Sidebar collapses/overlay, grid reflows | ✅ As expected | ✅ PASS |
| **RESP-03** | Responsive | Any | 1440px viewport | Full desktop layout, sidebar expanded | ✅ As expected | ✅ PASS |
| **ACC-01** | Accessibility | Any | Keyboard navigation | All interactive elements reachable and operable via Tab/Enter | ✅ As expected | ✅ PASS |
| **ACC-02** | Accessibility | Any | Toast banners | `role="status"` + `aria-live="polite"` on success toasts; `role="alert"` on errors | ✅ As expected | ✅ PASS |
| **ACC-03** | Accessibility | Any | Form labels | All inputs have visible labels or `aria-label` | ✅ As expected | ✅ PASS |

---

## Automated Test Results

| Suite | Tests | Passed | Failed |
|---|---|---|---|
| FastAPI / pytest (AI Service) | 29 | 29 | 0 |
| Node.js `--test` (Server) | 48 | 48 | 0 |
| Vitest (Client) | 63 | 63 | 0 |
| **Total** | **140** | **140** | **0** |

---

*Last updated: September 15, 2026*

---

## Sprint Additions (September 16, 2026)

| # | Feature | Role | Scenario | Expected Behavior | Actual Behavior | Test Result |
|---|---|---|---|---|---|---|
| **ADMIN-05** | Stats — Mentorships | Admin | View admin stats | 	otalMentorships count from real DB | ✅ As expected | ✅ PASS |
| **ADMIN-06** | Stats — Referrals | Admin | View admin stats | 	otalReferrals count from real DB | ✅ As expected | ✅ PASS |
| **ADMIN-07** | Stats — Interviews | Admin | View admin stats | 	otalInterviews (status=Interview Scheduled) from real DB | ✅ As expected | ✅ PASS |
| **ADMIN-08** | User Pagination | Admin | View user list | Paginated server-side (limit=50); response has users/total/page/totalPages | ✅ As expected | ✅ PASS |
| **REC-04** | Bulk App Fetch | Recruiter | Load recruiter dashboard | GET /applications/recruiter — 2 calls total, not N+1 | ✅ As expected | ✅ PASS |

## Updated Automated Test Results

| Suite | Tests | Passed | Failed |
|---|---|---|---|
| FastAPI / pytest (AI Service) | 38 | 38 | 0 |
| Node.js --test (Server) | 77 | 77 | 0 |
| Vitest (Client) | 63 | 63 | 0 |
| **Total** | **178** | **178** | **0** |

*Last updated: September 16, 2026 — Recruitment & Alumni Final Sprint*
