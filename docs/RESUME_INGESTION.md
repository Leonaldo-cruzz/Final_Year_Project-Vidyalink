# VidyaLink — Resume Ingestion & Document Intelligence Subsystem

## Overview

The **Resume Ingestion & Document Intelligence** subsystem in VidyaLink transforms student resumes from passive static files into active, machine-readable sources of truth. It extracts native text from uploaded `.pdf` and `.docx` documents, parses structured professional information, validates claims against student profiles and faculty-verified portfolios, and powers deterministic ATS evaluation.

---

## Architecture & Data Flow

```
Uploaded Resume (.pdf / .docx)
       │
       ▼
[multer Upload Middleware]
  ├── Max 5 MB, single file
  └── MIME & extension whitelist (.pdf, .docx)
       │
       ▼
[resume.service.js]
  ├── Compute SHA-256 contentHash (deduplication)
  │     ├── If duplicate & previous SUCCESS: Reuse parsed result & ATS score
  │     └── If new/modified: Increment version, remove old file, parse
       │
       ▼
[resumeParser.service.js]
  ├── Text Extraction:
  │     ├── PDF: pdf-parse (with Node 20+ Uint8Array memory isolation)
  │     │     └── Scanned / image-only detection (pages > 0, text === '')
  │     └── DOCX: mammoth.extractRawText({ buffer })
  │
  ├── Structured Parsing:
  │     ├── Contact (name, email, phone, location, links)
  │     ├── Technical Skills (vocabulary lookup + evidence snippet + source: 'resume')
  │     ├── Education (institution, degree, graduationYear, CGPA)
  │     ├── Experience (company, role, duration, description)
  │     ├── Projects (title, description, technologies, link)
  │     ├── Certifications (title, issuer)
  │     └── Achievements
  │
  ├── Traceable Profile Comparison:
  │     ├── Matched skills, Resume-only skills, Profile-only skills
  │     └── Conflict detection (education institution mismatch, phone mismatch)
  │
  └── Traceable Portfolio Comparison:
        ├── Project matching:
        │     ├── Faculty-verified in DB: "Verified in portfolio"
        │     ├── In DB but pending: "Present in portfolio (Pending faculty verification)"
        │     └── Not in DB: "Not found in verified portfolio." (UNVERIFIED_CLAIM)
        ├── Certificate matching:
        │     ├── Faculty-verified in DB: "Verified certificate"
        │     └── Not in DB: "Not found in verified certificates." (UNVERIFIED_CLAIM)
        └── GitHub account matching:
              ├── Matches connected account
              ├── Differs from connected account (MISMATCH)
              └── Present on resume but not connected on VidyaLink
       │
       ▼
[AI Gateway: aiIntegration.service.js]
  ├── Auto-trigger ATS analysis using extracted rawText (prioritized over disk)
  └── Persist ATS score linked with resumeVersion and resumeId
```

---

## Core Principles & Product Truth Invariants

1. **Zero Hallucination / No Synthetic Placeholders:**
   - Missing fields in resumes remain `null` or empty arrays `[]`.
   - The parser never fabricates universities, degrees, skills, or projects.
2. **No Silent Overwrites:**
   - Uploaded resumes never overwrite student profile fields automatically.
   - Profile updating is purely user-driven via selective checkboxes (`POST /api/v1/resume/import-to-profile`).
3. **Neutral & Traceable Verification Labels:**
   - Claims found on a resume that are not backed by faculty verification are labeled neutrally as `"Not found in verified portfolio."` or `"Not found in verified certificates."`
   - Verified portfolio evidence remains the authoritative source of truth.
4. **Deterministic Deduplication:**
   - Identical file re-uploads are detected via SHA-256 `contentHash`.
   - Redundant re-parsing and upstream ATS calls are avoided.
5. **Node 20+ Memory Pool Isolation:**
   - PDF buffers from multer are converted to clean `Uint8Array` slices before passing to `pdf-parse`, avoiding Node 20+ memory pool boundary conflicts (`bad XRef entry`).

---

## API Contract Reference

### 1. Upload Resume
- **Endpoint:** `POST /api/v1/resume/upload`
- **Content-Type:** `multipart/form-data` (`resume` field)
- **Allowed Formats:** `.pdf`, `.docx`
- **Max File Size:** 5 MB
- **Response:**
  ```json
  {
    "success": true,
    "message": "Resume uploaded, parsed, and ATS analyzed successfully",
    "data": {
      "resume": {
        "_id": "...",
        "originalFileName": "john_doe_resume.pdf",
        "fileType": "pdf",
        "version": 1,
        "contentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "parsingStatus": "SUCCESS",
        "uploadedAt": "2026-09-16T11:00:00.000Z"
      },
      "isDuplicate": false,
      "parsedData": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+91 9876543210",
        "skills": [
          { "value": "React", "source": "resume", "evidence": "Built UI components in React" }
        ],
        "education": [...],
        "experience": [...],
        "projects": [...]
      },
      "atsResult": {
        "score": 88,
        "summary": "Strong technical alignment",
        "breakdown": { ... }
      }
    }
  }
  ```

### 2. Consistency & Verification Comparison
- **Endpoint:** `GET /api/v1/resume/comparison`
- **Auth:** Student JWT
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "resume": {
        "id": "...",
        "version": 1,
        "fileName": "john_doe_resume.pdf",
        "fileType": "pdf"
      },
      "profileComparison": {
        "matchedSkills": ["React", "Node.js"],
        "resumeOnlySkills": ["Docker", "Kubernetes"],
        "profileOnlySkills": ["Python"],
        "conflicts": [
          {
            "field": "education",
            "resumeValue": "Stanford University",
            "profileValue": "National Institute of Technology",
            "message": "Resume and profile education differ."
          }
        ],
        "hasConflicts": true,
        "reviewSuggestions": [
          "2 new technical skill(s) found on your resume can be imported to your profile."
        ]
      },
      "portfolioComparison": {
        "projectsComparison": [
          {
            "title": "VidyaLink AI Platform",
            "status": "MATCHED",
            "verified": true,
            "label": "Verified in portfolio"
          },
          {
            "title": "Personal Blog Engine",
            "status": "UNVERIFIED_CLAIM",
            "verified": false,
            "label": "Not found in verified portfolio."
          }
        ],
        "certificatesComparison": [...],
        "githubComparison": {
          "status": "MATCHED",
          "label": "GitHub handle matches connected account",
          "match": true
        }
      }
    }
  }
  ```

### 3. Selective Import to Profile
- **Endpoint:** `POST /api/v1/resume/import-to-profile`
- **Body:**
  ```json
  {
    "skills": ["Docker", "Kubernetes"],
    "education": {
      "college": "National Institute of Technology",
      "degree": "B.Tech"
    }
  }
  ```
- **Behavior:**
  - Adds selected skills without duplicates.
  - Leaves unselected profile fields untouched.
  - Fills empty education fields; never overwrites existing profile college/degree without user consent.

### 4. Reanalyze ATS with Job Description
- **Endpoint:** `POST /api/v1/resume/reanalyze-ats`
- **Body:**
  ```json
  {
    "jobDescription": "Looking for a Full Stack Engineer experienced in React, FastAPI, and Docker..."
  }
  ```
- **Behavior:**
  - Extracts the active resume `rawText`.
  - Sends text + job description to the ATS analysis engine.
  - Links the new ATS score to the resume version (`resumeVersion: 1`).

---

## Status & Error Handling Codes

| Parsing Status | Meaning | User Feedback |
| :--- | :--- | :--- |
| `SUCCESS` | Document parsed and structured information extracted | Green badge, extracted information displayed |
| `IMAGE_ONLY` | Scanned document or image-only PDF without text layer | Warning banner: "Text could not be extracted. Please upload a machine-readable document." |
| `EMPTY` | Document is 0 bytes or has no textual content | Warning banner: "Document is empty." |
| `UNREADABLE` | Password-protected, corrupt, or invalid format | Error banner: "Document could not be read." |
| `FAILED` | Generic parsing or service error | Error banner with retry option |

---

## Testing & Verification

Automated test suite: `server/test/resume_ingestion.test.js`
- 27 unit and integration tests covering upload validation, PDF/DOCX text extraction, structured parsing, data truth invariants, profile and portfolio comparisons, deduplication via contentHash, selective import, and stale ATS detection.
- Pass rate: **100% (27/27)**.
