# VIDYALINK — Final System Architecture

**Document Date:** September 15, 2026  
**Version:** 1.0 (Production-ready, pre-deployment)  
**Scope:** Complete technical architecture for VidyaLink — Academic Evidence & Portfolio Verification Platform

---

## 1. High-Level Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        VidyaLink Platform                                │
│                                                                          │
│  ┌──────────────┐   HTTPS/REST   ┌──────────────────┐   HTTP/REST       │
│  │  React SPA   │◄──────────────►│  Express API      │◄────────────────►│
│  │  (Vite)      │                │  (Node.js)        │  FastAPI AI       │
│  │  Port: 5173  │                │  Port: 5000       │  Port: 8000       │
│  └──────────────┘                └──────────────────┘                   │
│                                         │                                │
│                                    MongoDB Atlas                         │
│                                    (Collections: 18)                     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend (React SPA)

### Technology Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| State | Context API (`AuthContext`) + local `useState`/`useCallback` |
| HTTP | Axios (with interceptors for JWT refresh) |
| Forms | React Hook Form + Zod validation |
| Styling | Vanilla CSS (custom design system in `index.css`) |
| Icons | Lucide React |
| PDF | jsPDF (client-side preview) |

### Directory Structure

```
client/src/
├── components/          # Reusable UI primitives and feature components
│   ├── ui/              # Button, Badge, Card, Modal, Avatar, Spinner, Tooltip
│   ├── layout/          # Sidebar, Topbar, Breadcrumb, Navbar
│   ├── projects/        # ProjectCard, ProjectForm, ProjectFilter
│   ├── verification/    # VerificationStatusBanner, VerificationCard
│   ├── github/          # GithubProfileCard, GithubConnectModal
│   ├── applications/    # ApplicationList, ApplicationStatusBadge
│   └── certificates/    # CertificateCard, CertificateForm
├── pages/               # Route-bound page components (role-separated)
│   ├── student/         # StudentDashboard, Resume, Certificates, GithubIntegration, AIInsights
│   ├── faculty/         # FacultyDashboard, FacultyVerificationDashboard, VerificationDetail
│   ├── recruiter/       # RecruiterDashboard, ApplicantManagement
│   ├── alumni/          # AlumniDashboard
│   ├── admin/           # AdminDashboard
│   ├── projects/        # Projects (list), CreateProject, EditProject, ProjectDetails
│   ├── portfolio/       # VerifiedPortfolio (private + public cert)
│   └── workspace/       # WorkspaceList, WorkspaceDetail
├── context/             # AuthContext — session state, login/logout/me
├── services/            # Axios API wrappers (one file per domain)
├── routes/              # AppRoutes.jsx + ProtectedRoute
├── layouts/             # DashboardLayout, AuthLayout, MainLayout
├── constants/           # ROUTES, ROLES, NAV_ITEMS, API endpoints
└── utils/               # formatDate, getErrorMessage, storage helpers
```

### Authentication Flow

1. User submits credentials → `POST /auth/login`
2. Server sets `accessToken` (15min) and `refreshToken` (7d) as `httpOnly` cookies
3. Axios interceptor catches 401, auto-calls `POST /auth/refresh-token`
4. New access token issued; original request retried transparently
5. `GET /auth/me` on app boot restores session state into `AuthContext`

### Route Protection

```
AppRoutes.jsx
└── ProtectedRoute (allowedRoles=[...])
    ├── If unauthenticated → redirect /login
    └── If wrong role → redirect to own dashboard
```

---

## 3. Backend API (Express / Node.js)

### Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ (ESM modules) |
| Framework | Express 4 |
| Database ORM | Mongoose 7 |
| Auth | JWT (httpOnly cookies) + bcrypt password hashing |
| File Storage | Multer → local `/uploads` directory |
| Validation | Zod (via `validate.middleware.js`) |
| Testing | Node.js built-in `--test` runner |

### Server Directory Structure

```
server/src/
├── models/              # 18 Mongoose schemas
├── services/            # Business logic (one class per domain)
├── controllers/         # HTTP handlers (thin, delegate to services)
├── routes/              # Express routers (one file per domain)
├── middleware/
│   ├── auth.middleware.js      # JWT verification
│   ├── role.middleware.js      # Role-based authorization
│   ├── validate.middleware.js  # Zod schema validation
│   └── upload middlewares      # Multer configs per resource type
├── utils/
│   ├── ApiError.js        # Standardized error class
│   ├── ApiResponse.js     # Standardized success/error JSON shape
│   └── asyncHandler.js    # Promise wrapper for Express routes
└── app.js                 # Express setup, CORS, cookie-parser, routes
```

### API Route Map

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Authenticate, set cookies |
| POST | `/auth/logout` | Any | Clear cookies |
| GET | `/auth/me` | Any | Session restore |
| POST | `/auth/refresh-token` | Any | Renew access token |
| POST | `/auth/forgot-password` | — | Generate reset token |
| POST | `/auth/reset-password` | — | Consume reset token + update password |
| GET/PUT | `/profile/me` | Any | Get/update own profile |
| GET/POST | `/projects` | Student | List/create own projects |
| GET/PUT/DELETE | `/projects/:id` | Student | Get/update/delete project |
| POST | `/projects/:id/verify-deployment` | Student | Real URL HEAD check |
| GET/POST | `/certificates` | Student | List/upload certificates |
| GET/PUT/DELETE | `/certificates/:id` | Student | Manage single certificate |
| GET/POST/PUT | `/resume` | Student | Manage resume record |
| POST | `/resume/generate` | Student | FastAPI PDF generation |
| GET | `/resume/download/:id` | Student | Serve resume PDF |
| POST | `/github/connect` | Student | Connect GitHub account |
| POST | `/github/sync` | Student | Re-sync GitHub snapshot |
| POST | `/github/disconnect` | Student | Disconnect GitHub |
| POST | `/verifications/submit` | Student | Submit for faculty review |
| GET | `/verifications/my` | Student | Own verification history |
| GET | `/verifications/queue` | Faculty | Pending submissions |
| GET | `/verifications/:id` | Faculty | Single submission detail |
| PATCH | `/verifications/:id/action` | Faculty | Approve/Reject/Request changes |
| GET | `/portfolio/me` | Student | Private verified portfolio |
| GET | `/portfolio/verify/:certId` | Public | Certificate public verification |
| POST | `/ai/evaluate` | Student | Run full AI evaluation |
| GET | `/ai/results` | Student | Retrieve latest AI result |
| POST | `/ai/skill-gap` | Student | Analyze skill gap for role |
| GET | `/ai/recommendations` | Student | Get alumni + opportunity recs |
| GET | `/ai/health` | Admin | FastAPI health check |
| GET/POST | `/mentorship` | Student/Alumni | Mentorship CRUD |
| PATCH | `/mentorship/:id/accept` | Alumni | Accept + schedule |
| POST | `/referrals` | Alumni | Post campus referral |
| GET | `/referrals` | Alumni | List own referrals |
| GET | `/applications` | Student/Recruiter | List applications (role-filtered) |
| POST | `/applications` | Student | Apply to project |
| PATCH | `/applications/:id/status` | Recruiter | Update application status |
| PATCH | `/applications/:id/interview` | Recruiter | Schedule interview |
| PATCH | `/applications/:id/select` | Recruiter | Select candidate |
| GET | `/notifications` | Any | List notifications |
| PATCH | `/notifications/:id/read` | Any | Mark single as read |
| PATCH | `/notifications/mark-all-read` | Any | Mark all as read |
| GET | `/admin/stats` | Admin | Platform-wide stats |
| GET | `/admin/users` | Admin | User directory |
| PATCH | `/admin/users/:id/status` | Admin | Toggle user status |
| GET/POST | `/workspaces` | Any | List/create workspaces |
| GET | `/workspace/:id` | Any | Workspace detail + milestones |

### Standard Response Envelope

```json
// Success
{
  "success": true,
  "message": "Human-readable description",
  "data": { ... }
}

// Error
{
  "success": false,
  "message": "Human-readable error description",
  "statusCode": 400
}
```

---

## 4. AI Service (FastAPI / Python)

### Technology Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI |
| AI/ML | OpenAI GPT-4 / Gemini via LangChain |
| PDF | PDFKit / pdfminer |
| Testing | pytest |

### AI Endpoints (consumed by Node API as internal proxy)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/evaluate` | Full portfolio evaluation (6 dimensions) |
| POST | `/ats-analyze` | ATS score + keyword matching for resume |
| POST | `/skill-gap` | Skill gap vs. target role |
| POST | `/industry-readiness` | Composite readiness score |
| POST | `/generate-resume` | ATS-safe PDF from profile data |
| POST | `/extract-skills` | Skill extraction from raw text |

### AI Data Flow

```
Student Profile + Projects + Certificates + GitHub + Resume
        │
        ▼
Node API (builds composite evidence payload)
        │
        ▼
FastAPI (AI evaluation, scoring, recommendations)
        │
        ▼
Node API (stores result in AIEvaluation collection)
        │
        ▼
Frontend (reads from AIEvaluation via GET /ai/results)
```

---

## 5. Database (MongoDB)

### Collections (18)

| Collection | Purpose |
|---|---|
| `users` | Authentication, roles, status |
| `profiles` | Student bio, education, skills, photo |
| `projects` | Portfolio projects with deploymentStatus |
| `certificates` | Uploaded certificates |
| `resumes` | Resume records (uploaded or generated) |
| `githubaccounts` | GitHub profile snapshots |
| `verifications` | Faculty verification workflow records |
| `portfolios` | Verified portfolio records with SHA-256 hash |
| `aievaluations` | AI evaluation results + version hashes |
| `applications` | Student-to-project applications |
| `mentorships` | Mentorship request records |
| `referrals` | Alumni campus referrals |
| `notifications` | Platform-wide notification records |
| `workspaces` | Project collaboration workspaces |
| `workspacemembers` | Workspace membership records |
| `milestones` | Workspace milestones |
| `sessions` | (Optional) Session records for refresh tracking |
| `passwordresettokens` | Hashed reset tokens with expiry |

### Key Indexing Strategy

- `users.email` — unique index (fast lookup)
- `projects.userId + createdAt` — compound index (owner list + sort)
- `projects.userId + verificationStatus + projectStatus` — compound index (faculty queue filter)
- `verifications.studentId + status` — compound index (student dashboard)
- `notifications.recipient + read + createdAt` — compound index (inbox query)
- `applications.projectId + applicantId` — compound index (per-project candidate list)

---

## 6. File Storage

Files are stored in `server/uploads/` with subdirectories:

```
uploads/
├── avatars/         # Profile photos
├── screenshots/     # Project screenshots
├── certificates/    # Certificate PDFs
└── resumes/         # Resume PDFs (uploaded + generated)
```

> **Note:** For production, these should be migrated to an object storage service (e.g., AWS S3, Cloudflare R2). The `upload.middleware.js` files can be updated to use `multer-s3` without changing any controller or service logic.

---

## 7. Security Measures

| Measure | Implementation |
|---|---|
| JWT in httpOnly cookies | `cookie-parser` + `sameSite: 'strict'` |
| Password hashing | bcrypt with salt rounds = 12 |
| RBAC | `role.middleware.js` checks `req.user.role` |
| Input validation | Zod schemas on all POST/PUT routes |
| File type validation | Multer `fileFilter` restricts MIME types |
| Ownership checks | Services verify `userId` matches resource owner |
| Rate limiting | Express `express-rate-limit` on auth routes |
| CORS | Configured for `VITE_APP_URL` only |
| Reset tokens | SHA-256 hashed before storage, 1hr expiry |

---

## 8. Environment Configuration

```env
# Server (.env)
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLIENT_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
UPLOAD_DIR=./uploads

# Client (.env)
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 9. Deployment Architecture (Target)

```
                                     ┌─────────────────────────┐
         User's Browser              │    Cloud Infrastructure   │
               │                     │                           │
               │ HTTPS               │  ┌─────────┐             │
               ▼                     │  │  Nginx  │             │
         CDN / Static Host ──────────►  │  Reverse│             │
         (Frontend Build)           │  │  Proxy  │             │
                                     │  └────┬────┘             │
                                     │       │                  │
                                     │  ┌────▼─────┐  ┌──────┐ │
                                     │  │  Node    │  │FastAPI│ │
                                     │  │  API     │  │  AI  │ │
                                     │  │  :5000   │  │ :8000│ │
                                     │  └────┬─────┘  └──────┘ │
                                     │       │                  │
                                     │  ┌────▼──────────────┐  │
                                     │  │   MongoDB Atlas    │  │
                                     │  └───────────────────┘  │
                                     └─────────────────────────┘
```

---

*Document maintained by: VidyaLink Engineering Team*  
*Last updated: September 15, 2026*
