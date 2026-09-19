# VidyaLink — Resume & ATS Integration API

## Overview

The resume workflow is a two-path system:

1. **Upload path** — student uploads their own PDF (existing).
2. **Generate path** — server assembles an ATS-safe PDF from the student's real profile data (new).

Both paths store the result in the same `Resume` document. ATS analysis is triggered automatically after generation and can also be triggered independently via the AI service.

---

## Architecture

```
React Client
  │
  ├── resumeService.js ─────────── POST /resume/generate ─────► Node backend
  │                                                                   │
  │                                                          resume.service.js
  │                                                                   │
  │                                                       ┌───────────┴───────────┐
  │                                                       │                       │
  │                                              PDF (pdfkit)              ATS auto-run
  │                                              written to disk    aiIntegration.service.js
  │                                                       │                       │
  │                                              uploads/resumes/       POST /api/v1/ats/analyze
  │                                                       │               (FastAPI ats_analyzer.py)
  │                                                Resume doc                     │
  │                                               updated in DB          AIAnalysis saved to DB
  │
  └── getLatestResume() ─────────── GET /resume/latest ──────► Node backend
                                                                    │
                                                       Resume doc + latest AIAnalysis
```

---

## Endpoints

### Existing Endpoints (unchanged)

#### `POST /api/v1/resume`
Upload a new student-supplied PDF.

**Request:** `multipart/form-data` with field `resume` (PDF, max 5 MB).  
**Auth:** JWT Bearer, `student` role only.  
**Response:**
```json
{
  "success": true,
  "message": "Resume uploaded successfully",
  "data": { <Resume document> }
}
```

#### `GET /api/v1/resume`
Fetch current resume metadata (no ATS result).

**Auth:** JWT Bearer, `student` role only.  
**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "userId": "...",
    "originalFileName": "my_resume.pdf",
    "fileUrl": "/uploads/resumes/resume-abc123.pdf",
    "fileSize": 120000,
    "status": "UPLOADED",
    "resumeSource": "uploaded",
    "uploadedAt": "2026-09-10T10:00:00Z"
  }
}
```

#### `PUT /api/v1/resume`
Replace the existing resume with a new PDF.

**Request:** `multipart/form-data` with field `resume`.  
**Auth:** JWT Bearer, `student` role only.

#### `DELETE /api/v1/resume`
Delete the student's current resume.

**Auth:** JWT Bearer, `student` role only.

---

### New Endpoints

#### `POST /api/v1/resume/generate`
Generate an ATS-safe PDF from the student's real profile data.

**Auth:** JWT Bearer, `student` role only.

**Request body (all optional):**
```json
{
  "jobDescription": "string (max 50000 chars) — optional target job description for keyword matching",
  "sections": {
    "contact":        true,
    "summary":        true,
    "skills":         true,
    "education":      true,
    "projects":       true,
    "certifications": true,
    "github":         true
  }
}
```

**Section rules:**
- All sections default to `true` (included).
- A section set to `false` is excluded from the PDF.
- Sections with no content are automatically omitted regardless of the toggle.

**Data sources used:**
| Section | Source |
|---|---|
| Contact | `User.fullName`, `User.email`, `Profile.phone`, `Profile.linkedin`, `Profile.github` |
| Summary | `Profile.bio` |
| Skills | `Profile.skills` + `Certificate.skills` (de-duplicated) |
| Education | `Profile.degree`, `Profile.college`, `Profile.branch`, `Profile.graduationYear`, `Profile.cgpa` |
| Projects | `Portfolio → Workspace → Project` (verified first), then `Project` (owned, not archived) |
| Certifications | `Certificate` where `verificationStatus === 'Verified'` |
| GitHub | `GitHubAccount` where `connectionStatus === 'Connected'` |

**ATS analysis:** runs automatically after PDF generation (non-blocking). If ATS fails, the resume is still returned.

**Response:**
```json
{
  "success": true,
  "message": "Resume generated successfully",
  "data": {
    "resume": {
      "_id": "...",
      "originalFileName": "Priya_Malhotra_resume.pdf",
      "fileUrl": "/uploads/resumes/resume-gen-uid-1234567890.pdf",
      "fileSize": 48123,
      "status": "GENERATED",
      "resumeSource": "generated",
      "generatedAt": "2026-09-10T11:55:00Z",
      "sourceSnapshot": "sha256hex...",
      "generationVersion": "1.0.0"
    },
    "atsResult": {
      "ats_score": 74.5,
      "keyword_match_score": 68.0,
      "skills_score": 82.0,
      "education_score": 100.0,
      "experience_score": 50.0,
      "formatting_score": 90.0,
      "section_completeness": {
        "summary": true,
        "skills": true,
        "education": true,
        "experience": false,
        "projects": true,
        "certifications": true,
        "achievements": false
      },
      "missing_keywords": ["Docker", "REST APIs"],
      "detected_skills": ["Python", "Node.js", "React"],
      "suggestions": ["Consider adding a clearly labelled experience section if applicable."]
    }
  }
}
```

**Error cases:**
| Status | Scenario |
|---|---|
| 400 | No profile data to generate from |
| 401 | Not authenticated |
| 403 | Non-student role |
| 502 | AI service unavailable (resume still generated; `atsResult` will be `null`) |

---

#### `GET /api/v1/resume/latest`
Returns the current resume document plus the most recent stored ATS analysis result.

**Auth:** JWT Bearer, `student` role only.

**Response:**
```json
{
  "success": true,
  "data": {
    "resume": { <Resume document> },
    "atsResult": { <ATS result object or null> }
  }
}
```

**Notes:**
- `atsResult` is `null` when no ATS analysis has been run yet.
- `atsResult` reflects the most recent `AIAnalysis` document with `analysisType: 'ats'` for this student.

---

#### `POST /api/v1/resume/check-stale`
Recomputes the source snapshot from the current profile data and marks the resume as `STALE` if the data has changed since the last generation.

**Auth:** JWT Bearer, `student` role only.  
**Request body:** Empty.

**Response:**
```json
{
  "success": true,
  "message": "Resume is stale — profile data has changed",
  "data": {
    "isStale": true,
    "resume": { <Resume document with status: 'STALE'> }
  }
}
```

**Stale trigger conditions:**
A resume is marked STALE when any of the following change after the last generation:
- `User.fullName`, `User.college`, `User.branch`, `User.graduationYear`
- `Profile.headline`, `Profile.bio`, `Profile.phone`, `Profile.skills` (sorted), `Profile.interests`, `Profile.cgpa`, `Profile.degree`, `Profile.linkedin`, `Profile.github`
- Any verified `Certificate` (title, issuer, issueDate)
- Any project linked to the student (title, technologies)
- GitHub account connection status

---

### ATS Analysis Endpoint (AI Service)

#### `POST /api/v1/ai/ats/analyze`
Runs ATS analysis against the student's stored resume text. Can also be called with a custom job description.

**Auth:** JWT Bearer, student / faculty / recruiter / admin.

**Request body:**
```json
{
  "jobDescription": "optional target job description text"
}
```

**Response:**
```json
{
  "success": true,
  "message": "ATS analysis completed",
  "data": {
    "status": "analyzed",
    "analysis": {
      "id": "...",
      "analysisType": "ats",
      "result": {
        "ats_score": 74.5,
        "keyword_match_score": 68.0,
        "skills_score": 82.0,
        "education_score": 100.0,
        "experience_score": 50.0,
        "formatting_score": 90.0,
        "section_completeness": { ... },
        "missing_keywords": ["Docker"],
        "detected_skills": ["Python"],
        "suggestions": [...]
      }
    }
  }
}
```

**Insufficient evidence:**
```json
{
  "status": "insufficient_evidence",
  "reason": "No readable stored resume text is available."
}
```

---

## Resume Status Machine

```
          Manual Upload
               │
               ▼
           UPLOADED ──── Manual Upload ────► UPLOADED (reset)
               │
       Generate from Profile
               │
               ▼
           GENERATED
               │
         Profile changes
               │
               ▼
             STALE ──── Regenerate ────► GENERATED
```

| Status | Description |
|---|---|
| `UPLOADED` | Student-supplied PDF; generation metadata cleared |
| `GENERATED` | Server-generated ATS-safe PDF; snapshot stored |
| `STALE` | Generated, but profile data changed since last generation |

---

## Data Consistency Guarantee

```
Resume Builder UI (section toggles + JD)
  = POST /resume/generate payload
  = Generated PDF (same data, same session)
  = Resume.storedFileName on disk
  = AIAnalysis source (resume text extracted from same PDF)
  = GET /resume/latest atsResult
```

The preview iframe and the downloadable PDF refer to the same `fileUrl`. No divergence.

---

## Security

- Only the owning student can generate, view, or delete their resume (`authorize('student')` on all routes).
- File paths are validated to stay within `uploads/resumes/` (path traversal prevention).
- Generated filenames use `userId + timestamp`, not user-supplied values.
- No personal data from other users can appear in any resume (queries always filter by `userId`).
