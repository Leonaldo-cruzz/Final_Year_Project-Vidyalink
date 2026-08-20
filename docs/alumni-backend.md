# Alumni Backend — Technical Documentation

## Overview

The alumni backend adds five fully independent domain modules to VIDYALINK:

| Module | Route Prefix | Description |
|--------|-------------|-------------|
| Alumni Profile | `/api/v1/alumni` | Professional profile for alumni users |
| Mentorship Requests | `/api/v1/mentorship` | Students request mentorship from alumni |
| Skill Endorsements | `/api/v1/alumni` | Verified alumni endorse student skills |
| Referrals | `/api/v1/referrals` | Verified alumni refer students for jobs |
| Mock Interviews | `/api/v1/mock-interviews` | Students request practice interviews |

---

## Database Models

### `AlumniProfile`

One-to-one with `User` (role = `alumni`). Tracks professional information and verification status.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | ObjectId → User | ✅ | Unique index |
| `company` | String | ❌ | max 200 |
| `designation` | String | ❌ | max 150 |
| `industry` | String (enum) | ❌ | One of 11 industry values |
| `experienceYears` | Number | ❌ | 0–60 |
| `bio` | String | ❌ | max 2000 |
| `skills` | [String] | ❌ | max 50 entries, each max 50 chars |
| `linkedinUrl` | String | ❌ | URL, max 2048 |
| `githubUrl` | String | ❌ | URL, max 2048 |
| `companyWebsite` | String | ❌ | URL, max 2048 |
| `location` | String | ❌ | max 150 |
| `isVerified` | Boolean | — | Default `false`. Admin-managed only |

**Indexes:** `{ userId: 1 }` (unique), `{ isVerified: 1 }`, `{ industry: 1 }`, `{ isVerified, industry }`

---

### `MentorshipRequest`

Tracks a mentorship relationship lifecycle between a student and an alumni.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `alumniId` | ObjectId → User | ✅ | |
| `studentId` | ObjectId → User | ✅ | |
| `topic` | String | ✅ | 3–200 chars |
| `message` | String | ✅ | 10–2000 chars |
| `status` | Enum | — | `PENDING` \| `ACCEPTED` \| `DECLINED` \| `CANCELLED` \| `COMPLETED` |
| `responseMessage` | String | ❌ | Alumni's optional reply, max 2000 |

**State Machine:**
```
PENDING → ACCEPTED (alumni)
PENDING → DECLINED (alumni)
PENDING → CANCELLED (student)
ACCEPTED → COMPLETED (alumni)
```

**Indexes:** `{ alumniId, status }`, `{ studentId, status }`, `{ alumniId, studentId, status }`

---

### `SkillEndorsement`

Alumni endorses a skill present on a student's profile.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `alumniId` | ObjectId → User | ✅ | |
| `studentId` | ObjectId → User | ✅ | |
| `skill` | String | ✅ | max 50. Must exist on student's profile |
| `message` | String | ❌ | max 500 |

**Indexes:** `{ alumniId, studentId, skill }` (unique — prevents duplicate endorsements), `{ studentId }`, `{ alumniId }`

---

### `Referral`

Alumni refers a student for a job at their company.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `alumniId` | ObjectId → User | ✅ | |
| `studentId` | ObjectId → User | ✅ | |
| `companyName` | String | ✅ | max 200 |
| `jobTitle` | String | ✅ | max 150 |
| `jobUrl` | String | ❌ | URL, max 2048 |
| `message` | String | ❌ | max 2000 |
| `status` | Enum | — | `DRAFT` \| `SUBMITTED` \| `UNDER_REVIEW` \| `REFERRED` \| `REJECTED` \| `CLOSED` |
| `referredAt` | Date | ❌ | Auto-set when status transitions to `REFERRED` |

**Indexes:** `{ alumniId, status }`, `{ studentId }`, `{ alumniId }`

---

### `MockInterviewRequest`

Student requests a practice interview from a verified alumni.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `alumniId` | ObjectId → User | ✅ | |
| `studentId` | ObjectId → User | ✅ | |
| `topic` | String | ✅ | 3–200 chars |
| `scheduledAt` | Date | ✅ | Must be in the future |
| `durationMinutes` | Number | ✅ | 15–240 |
| `mode` | Enum | ✅ | `ONLINE` \| `OFFLINE` |
| `meetingUrl` | String | ❌ | Required for ONLINE on accept |
| `location` | String | ❌ | Required for OFFLINE on accept |
| `status` | Enum | — | `REQUESTED` \| `ACCEPTED` \| `DECLINED` \| `COMPLETED` \| `CANCELLED` |
| `feedback` | String | ❌ | Alumni provides on completion, max 3000 |

**State Machine:**
```
REQUESTED → ACCEPTED (alumni, with conflict check)
REQUESTED → DECLINED (alumni)
REQUESTED → CANCELLED (student or alumni)
ACCEPTED  → COMPLETED (alumni, with feedback)
ACCEPTED  → CANCELLED (alumni)
ACCEPTED  → ACCEPTED  (alumni reschedule)
```

**Indexes:** `{ alumniId, status }`, `{ studentId, status }`, `{ alumniId, scheduledAt }`

---

## Relationships

```
User (role=alumni) ──1:1──► AlumniProfile
User (role=student)──────┐
User (role=alumni) ───────┴──►  MentorshipRequest (alumniId, studentId)
User (role=alumni) ──────────►  SkillEndorsement  (alumniId, studentId)
User (role=alumni) ──────────►  Referral           (alumniId, studentId)
User (role=alumni) ──────────►  MockInterviewRequest (alumniId, studentId)

StudentProfile.skills ◄── validated by EndorsementService before creation
```

---

## API Endpoints

### Alumni Profile — `/api/v1/alumni`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/profile` | alumni | Get own profile |
| `POST` | `/profile` | alumni | Create profile (one per user) |
| `PATCH` | `/profile` | alumni | Update own profile |
| `PATCH` | `/users/:userId/verify` | admin | Set `isVerified` for any alumni |

### Skill Endorsements — `/api/v1/alumni`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `POST` | `/endorsements` | alumni (verified) | Create endorsement |
| `GET` | `/students/:studentId/endorsements` | alumni, student, admin | List endorsements |
| `DELETE` | `/endorsements/:id` | alumni (owner) | Delete own endorsement |

### Mentorship Requests — `/api/v1/mentorship`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `POST` | `/requests` | student | Request mentorship from an alumni |
| `GET` | `/student` | student | List own requests (as student) |
| `GET` | `/alumni` | alumni | List incoming requests (as alumni) |
| `GET` | `/requests/:id` | student, alumni, admin | Get request (participants only) |
| `PATCH` | `/requests/:id/accept` | alumni (verified) | Accept PENDING request |
| `PATCH` | `/requests/:id/decline` | alumni (verified) | Decline PENDING request |
| `PATCH` | `/requests/:id/cancel` | student | Cancel own PENDING request |
| `PATCH` | `/requests/:id/complete` | alumni | Mark ACCEPTED request COMPLETED |

### Referrals — `/api/v1/referrals`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `POST` | `/` | alumni (verified) | Create referral |
| `GET` | `/alumni` | alumni | Own referrals |
| `GET` | `/student` | student | Own referrals |
| `GET` | `/:id` | alumni, student, admin | Get by ID (participants only) |
| `PATCH` | `/:id` | alumni (owner) | Update referral |
| `DELETE` | `/:id` | alumni (owner) | Delete DRAFT referral only |

### Mock Interviews — `/api/v1/mock-interviews`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `POST` | `/` | student | Request mock interview |
| `GET` | `/student` | student | Own requests (as student) |
| `GET` | `/alumni` | alumni | Incoming requests (as alumni) |
| `GET` | `/:id` | student, alumni, admin | Get by ID (participants only) |
| `PATCH` | `/:id/accept` | alumni (verified) | Accept with meetingUrl/location |
| `PATCH` | `/:id/decline` | alumni (verified) | Decline REQUESTED interview |
| `PATCH` | `/:id/reschedule` | alumni (verified) | Reschedule ACCEPTED interview |
| `PATCH` | `/:id/complete` | alumni | Complete with feedback |
| `PATCH` | `/:id/cancel` | student, alumni | Cancel (role-aware state rules) |

---

## Role Permissions Summary

| Action | student | alumni (unverified) | alumni (verified) | admin |
|--------|---------|--------------------|--------------------|-------|
| Create alumni profile | ❌ | ✅ | ✅ | ❌ |
| Set alumni verification | ❌ | ❌ | ❌ | ✅ |
| Request mentorship | ✅ | ❌ | ❌ | ❌ |
| Accept/decline mentorship | ❌ | ❌ | ✅ | ❌ |
| Cancel mentorship | ✅ | ❌ | ❌ | ❌ |
| Endorse skills | ❌ | ❌ | ✅ | ❌ |
| Create referral | ❌ | ❌ | ✅ | ❌ |
| Request mock interview | ✅ | ❌ | ❌ | ❌ |
| Accept/decline mock interview | ❌ | ❌ | ✅ | ❌ |

---

## Security Notes

- **Ownership**: Every mutation checks ownership against `req.user._id` — never trusts client-provided user IDs.
- **Verified alumni guard**: `alumniService.requireVerifiedAlumni()` is called at the service layer for all mentorship, endorsement, referral, and mock interview operations.
- **Participant-only access**: `getRequestById` / `getReferralById` / `getRequestById` verify the viewer is a participant before returning private data.
- **Duplicate prevention**: Compound unique index `{ alumniId, studentId, skill }` on `SkillEndorsement`; PENDING duplicate check in `MentorshipService.requestMentorship`.
- **MongoDB ID validation**: Zod `mongoId()` helper enforces 24-char hex via regex before hitting the DB.
- **Schedule conflicts**: `MockInterviewService.acceptRequest` and `rescheduleRequest` query ACCEPTED interviews and detect time-range overlaps before allowing acceptance.
- **No private field exposure**: `populate()` calls whitelist only `fullName email avatar` (and `college branch` where relevant) — never exposes `password`, `refreshToken`, or `status`.

---

## Sample Requests & Responses

### Create Alumni Profile

```http
POST /api/v1/alumni/profile
Authorization: Bearer <alumni_token>

{
  "company": "Google",
  "designation": "Staff Engineer",
  "industry": "Technology",
  "experienceYears": 8,
  "bio": "Passionate about distributed systems and mentoring the next generation.",
  "skills": ["Go", "Kubernetes", "System Design"],
  "linkedinUrl": "https://linkedin.com/in/priya-sharma",
  "location": "Bengaluru, India"
}
```

**Response 201:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Alumni profile created successfully",
  "data": {
    "profile": {
      "_id": "...",
      "userId": { "_id": "...", "fullName": "Priya Sharma", "email": "priya@example.com" },
      "company": "Google",
      "designation": "Staff Engineer",
      "isVerified": false,
      "createdAt": "2026-08-18T09:30:00.000Z"
    }
  }
}
```

---

### Create Mentorship Request

```http
POST /api/v1/mentorship/requests
Authorization: Bearer <student_token>

{
  "alumniId": "64c1234567890abcdef01234",
  "topic": "Preparing for product-based company interviews",
  "message": "I am a final-year CS student and would love to learn about your career path and get tips on cracking top tech companies."
}
```

**Response 201:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Mentorship request sent successfully",
  "data": {
    "request": {
      "_id": "...",
      "alumniId": { "fullName": "Priya Sharma", "email": "priya@example.com" },
      "studentId": { "fullName": "Rahul Verma", "email": "rahul@example.com" },
      "topic": "Preparing for product-based company interviews",
      "status": "PENDING"
    }
  }
}
```

---

### Create Skill Endorsement

```http
POST /api/v1/alumni/endorsements
Authorization: Bearer <alumni_token>

{
  "studentId": "64c1234567890abcdef56789",
  "skill": "Node.js",
  "message": "Rahul built a production-grade REST API with advanced JWT auth. Highly skilled."
}
```

---

### Create Referral

```http
POST /api/v1/referrals
Authorization: Bearer <alumni_token>

{
  "studentId": "64c1234567890abcdef56789",
  "companyName": "Stripe",
  "jobTitle": "Software Engineer – Backend",
  "jobUrl": "https://stripe.com/jobs/listing/12345",
  "message": "I worked with Rahul on an open source project. He is an exceptional backend engineer.",
  "status": "SUBMITTED"
}
```

---

### Request Mock Interview

```http
POST /api/v1/mock-interviews
Authorization: Bearer <student_token>

{
  "alumniId": "64c1234567890abcdef01234",
  "topic": "System Design — URL Shortener",
  "scheduledAt": "2026-09-01T14:00:00.000Z",
  "durationMinutes": 60,
  "mode": "ONLINE"
}
```

---

## Running Tests

```bash
# Start the server in one terminal
cd server
npm run dev

# In a second terminal
npm run test:alumni
```

The test script registers ephemeral users (`*_<timestamp>@vidyalink.test`), exercises every endpoint including state-machine transitions, and exits with code 0 on success or 1 on any failure.
