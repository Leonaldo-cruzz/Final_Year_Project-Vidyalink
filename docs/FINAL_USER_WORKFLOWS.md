# VIDYALINK — Final User Workflows

**Document Date:** September 15, 2026  
**Scope:** Step-by-step actual user flows for all 5 roles in VidyaLink

---

## Role 1: Student

### Core Workflow: Registration → Verified Portfolio → AI Insights → Application

```
Step 1: Registration
  → /register
  → Select role: Student
  → Enter: Full Name, Email, Password, Institution, Course, Year
  → Account created → redirected to /dashboard/student

Step 2: Complete Profile
  → /profile
  → Add: Skills, Education, Bio, Contact Info
  → Optional: Upload profile photo

Step 3: Add Projects
  → /projects → click "Add Project"
  → Fill: Title, Short Description, Detailed Description, Category
  → Add: Technologies, GitHub Repo URL, Live Deployment URL
  → Upload: Screenshots (optional)
  → Click "Create Project" → project created with verificationStatus: Pending

Step 4: Upload Certificates
  → /certificates → click "Upload Certificate"
  → Fill: Certificate name, Issuer, Issue Date
  → Upload PDF ≤ 5MB
  → Click "Upload"

Step 5: Connect GitHub
  → /github → click "Connect GitHub"
  → Enter GitHub username
  → Profile snapshot synced from real GitHub API
  → Can click "Sync" anytime to refresh snapshot

Step 6: Submit for Faculty Verification
  → /dashboard/student
  → Click "Submit Portfolio for Verification"
  → Verification record created with status PENDING
  → Faculty notified

Step 7: Await Faculty Decision
  → Dashboard shows: "Pending Faculty Review"
  → Three possible outcomes:
    a) CHANGES_REQUESTED: View remarks → update projects → resubmit
    b) REJECTED: View remarks → update → resubmit
    c) VERIFIED: Dashboard updates → "Access Verified Portfolio" appears

Step 8: View Verified Portfolio
  → Click "Access Verified Portfolio" or navigate to /portfolio/me
  → SHA-256 certificate hash displayed
  → Public shareable link: /portfolio/verify/:certificateId
  → Copy link to clipboard

Step 9: AI Insights (gated on verification)
  → /ai-insights
  → Click "Run AI Evaluation"
  → Results displayed:
    - Overall Portfolio Score (0-100)
    - 6 component scores (Projects, Skills, GitHub, Resume, Experience, Certifications)
    - Skill Gap Analysis (select target role)
    - Industry Readiness Score
    - Recommended alumni mentors
    - Recommended recruiter opportunities

Step 10: Resume Builder
  → /resume
  → Click "Generate Resume" → ATS-safe PDF from real profile data
  → OR upload existing PDF
  → View ATS score, keyword match, missing keywords
  → If profile updated after generation → "Stale — regenerate" banner shown

Step 11: Live Deployment Verification
  → /projects → click project → "Details"
  → Scroll to "Live Deployment Verification" section
  → Click "Check Deployment"
  → Status shows: reachable / unreachable / failed / not_provided

Step 12: Apply to Opportunity
  → /dashboard/student → view recommended opportunities
  → OR browse via recruiter-posted projects
  → Click "Apply"
  → Application created with status: Applied
  → Track at /applications

Step 13: Mentorship Request
  → /ai-insights → scroll to Alumni Mentors section
  → Click "Request Mentorship" on an alumni
  → Select focus skill + write message
  → Mentorship request submitted → alumni notified

Step 14: Track Applications
  → /applications
  → View status for each application:
    Applied → Under Review → Shortlisted → Interview Scheduled → Selected / Rejected
  → Notifications appear in top bar for each transition
```

---

## Role 2: Faculty

### Core Workflow: View Queue → Review → Decision

```
Step 1: Login as Faculty
  → /login → select Faculty role
  → Redirected to /dashboard/faculty

Step 2: View Pending Verifications
  → /faculty/verifications
  → List of PENDING submissions with:
    - Student name
    - Project title + category
    - Submitted date
    - Review priority (NORMAL / MEDIUM / HIGH based on age)

Step 3: Review Submission
  → Click submission → /faculty/verifications/:id
  → View:
    - Student profile details
    - Project full details (tech, description, links, screenshots)
    - Uploaded certificates
    - GitHub snapshot
    - Resume preview

Step 4: Make Decision
  → Option A: "Verify" → Portfolio created, student notified with success notification
  → Option B: "Request Changes" → Enter remarks → student sees remarks on dashboard
  → Option C: "Reject" → Enter remarks → student sees rejection state

Step 5: Monitor Backlog
  → Dashboard shows:
    - Total pending count
    - Verified this week
    - Average review time
```

---

## Role 3: Recruiter

### Core Workflow: Browse Talent → Review Candidate → Application Pipeline → Interview → Hire

```
Step 1: Login as Recruiter
  → /login → select Recruiter role
  → Redirected to /dashboard/recruiter

Step 2: Browse Verified Talent
  → Talent Hub shows:
    - Active projects from verified students
    - Filter by technology, category, status
    - Candidate cards with AI readiness score

Step 3: Review Candidate Dossier
  → Click candidate
  → View:
    - Verified portfolio with SHA-256 certificate
    - AI evaluation scores
    - GitHub metrics (repos, followers, activity)
    - Resume with ATS score
    - Application history

Step 4: Post Opportunity
  → Click "Post Opportunity"
  → Fill: Title, Description, Technologies, Category
  → Opportunity posted; eligible students can apply

Step 5: Manage Applications
  → /recruiter/applicants (or per-project)
  → View all applications with status indicators
  → Move applications through pipeline:
    Applied → Under Review → Shortlisted → Interview Scheduled → Selected / Rejected

Step 6: Schedule Interview
  → On application card → "Schedule Interview"
  → Set: Date, Mode (Online / Offline / Hybrid), Notes
  → Student receives notification with interview details

Step 7: Select Candidate
  → Click "Select Candidate"
  → Application → Selected
  → Project moves to in_progress
  → Workspace provisioned for collaboration
  → Student notified: "Congratulations — you've been selected!"
```

---

## Role 4: Alumni

### Core Workflow: Mentorship + Referrals

```
Step 1: Login as Alumni
  → /login → select Alumni role
  → Redirected to /dashboard/alumni (Mentorship Hub)

Step 2: View Mentorship Requests
  → Incoming requests from students (via AI recommendations)
  → Each request shows:
    - Student name + institution
    - Focus skill
    - Request message

Step 3: Respond to Mentorship Request
  → Option A: Accept
    → Optionally set scheduled date
    → Status → ACCEPTED
    → Student notified: session date confirmed
  → Option B: Decline
    → Request removed from queue

Step 4: Track Active Mentees
  → "Active Mentees" stat shows count from DB
  → View mentee details per session

Step 5: Post Campus Referral
  → Click "Post Campus Referral"
  → Enter: Company name, Role
  → Referral published → visible to platform (can be surfaced to students via AI)

Step 6: View Referral History
  → Dashboard shows referrals list from DB
  → Filter by date, company, role
```

---

## Role 5: Admin

### Core Workflow: Platform Monitoring + User Management

```
Step 1: Login as Admin
  → /login → select Admin role (admin accounts created out-of-band)
  → Redirected to /dashboard/admin

Step 2: View Platform Statistics
  → Stats cards show from real DB aggregation:
    - Total Users (with breakdown by role)
    - Active Projects
    - Verified Portfolios
    - Total Applications

Step 3: Manage Users
  → User Directory with search (name / email / institution)
  → Role filter: All / Student / Faculty / Recruiter / Alumni
  → Each user shows: Name, Email, Role, Status (Active / Pending / Restricted)
  → Toggle user status: Active ↔ Inactive

Step 4: Monitor AI Service Health
  → AI Health card shows: Available / Unavailable
  → Click "Refresh" → real ping to FastAPI /health endpoint
  → Shows: status, last checked timestamp

Step 5: Access Any Dashboard
  → Admin role has access to all protected routes for oversight
```

---

## Cross-Role Notification Events

| Trigger | Sender Role | Recipient Role | Notification Text |
|---|---|---|---|
| Portfolio verified | Faculty | Student | "Your project [title] has been verified by faculty!" |
| Changes requested | Faculty | Student | "Faculty requested changes to your verification submission." |
| Portfolio rejected | Faculty | Student | "Your verification submission was not approved. See remarks." |
| Application Under Review | Recruiter | Student | "Your application is now under review." |
| Application Shortlisted | Recruiter | Student | "You've been shortlisted for [project]!" |
| Interview Scheduled | Recruiter | Student | "Your interview is scheduled for [date]." |
| Candidate Selected | Recruiter | Student | "Congratulations! You've been selected for [project]." |
| Mentorship Request | Student | Alumni | "[Student name] wants mentorship on [skill]." |

---

*Last updated: September 15, 2026*
