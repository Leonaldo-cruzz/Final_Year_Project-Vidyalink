# VidyaLink — AI API Contract & Specification

## Architecture Overview

All client requests communicate strictly through the **Node.js Express Gateway** (`/api/v1/ai/*`). The Node.js gateway validates JWT authentication, checks Role-Based Access Control (RBAC), enforces ownership, resolves database evidence, formats requests, and invokes the internal **FastAPI AI Service** (`ai-service` on port 8000). React clients NEVER call FastAPI directly.

```
React Client (Vite)
       │
       ▼ (HTTPS / JWT Bearer)
Node.js Gateway (/api/v1/ai/*)
       │
       ▼ (Internal HTTP, bounded 15s timeout)
FastAPI AI Service (/api/v1/*)
```

---

## 1. Node.js Gateway Endpoints

### 1.1 `GET /api/v1/ai/health`
Checks the operational health and connectivity between Node.js and FastAPI.
- **Auth:** Public / Authenticated
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "aiService": "connected",
    "provider": "vidyalink-local",
    "model": "deterministic-heuristics",
    "version": "1.0.0"
  }
}
```
*Note: If FastAPI is down, returns `200 OK` with `status: "degraded", "aiService": "unavailable"`.*

---

### 1.2 `POST /api/v1/ai/evaluate`
Triggers the full, unified multi-stage AI evaluation pipeline for the authenticated student.
- **Auth:** Authenticated Student (`student` role)
- **Request Body:** None (or `{ "force": true }` to bypass contentHash deduplication)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "evaluationId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "status": "COMPLETED",
    "evaluationVersion": 2,
    "portfolio": {
      "overallScore": 84,
      "category": "Proficient Developer",
      "componentScores": {
        "projectComplexity": 85,
        "technologyStack": 80,
        "githubActivity": 82,
        "documentationQuality": 88,
        "innovation": 80,
        "codeQuality": 90
      },
      "weightedBreakdown": {
        "projectComplexity": { "score": 85, "weight": 0.25, "contribution": 21.25 },
        "technologyStack": { "score": 80, "weight": 0.20, "contribution": 16.00 },
        "githubActivity": { "score": 82, "weight": 0.15, "contribution": 12.30 },
        "documentationQuality": { "score": 88, "weight": 0.15, "contribution": 13.20 },
        "innovation": { "score": 80, "weight": 0.15, "contribution": 12.00 },
        "codeQuality": { "score": 90, "weight": 0.10, "contribution": 9.00 }
      },
      "projectEvaluations": [
        {
          "project_id": "proj-1",
          "title": "Decentralized Credential Verifier",
          "overall_score": 84,
          "component_scores": {
            "project_complexity": 85,
            "technology_stack": 80,
            "github_activity": 82,
            "documentation_quality": 88,
            "innovation": 80,
            "code_quality": 90
          },
          "strengths": ["Well-structured microservices architecture"],
          "improvements": ["Add comprehensive integration test suites"],
          "deployment_url": "https://demo.vidyalink.edu/proj1",
          "deployment_verified": true
        }
      ],
      "strengths": ["Robust tech stack", "Verified live deployments"],
      "improvements": ["Expand test coverage across async handlers"]
    },
    "skills": {
      "technical": ["React", "Node.js", "Python", "Docker"],
      "tools": ["Git", "Postman"],
      "domains": ["Web Development", "Cloud Computing"]
    },
    "skillGap": {
      "targetRole": "Full Stack Engineer",
      "matchedSkills": ["React", "Node.js", "Docker"],
      "missingSkills": ["GraphQL", "Kubernetes"],
      "coveragePercentage": 75
    },
    "github": {
      "derivedActivityScore": 82,
      "publicRepos": 14,
      "lastSyncedAt": "2026-09-14T10:30:00.000Z"
    },
    "ats": {
      "atsScore": 86,
      "keywordMatches": ["React", "Express", "MongoDB"],
      "suggestions": ["Add measurable metrics to project impact bullets"]
    },
    "readiness": {
      "readinessScore": 83,
      "breakdown": {
        "portfolio": 84,
        "skills": 75,
        "github": 82,
        "ats": 86
      }
    },
    "recommendations": {
      "alumni": [],
      "opportunities": []
    }
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: `{ "message": "No verified portfolio evidence found" }`
  - `401 Unauthorized`: Token missing or invalid
  - `403 Forbidden`: User role is not student

---

### 1.3 `GET /api/v1/ai/results`
Fetches the latest stored AI evaluation snapshot for the target portfolio/student.
- **Auth:** Student (own), Faculty, Recruiter (if student has applied to their job), Admin
- **Query Params:**
  - `portfolioId` (optional for faculty/recruiter)
  - `studentId` (optional for faculty/recruiter)
- **Response `200 OK`:** Returns unified snapshot matching `POST /api/v1/ai/evaluate` response format.

---

### 1.4 `GET /api/v1/ai/results/history`
Returns historical evaluation runs for trend tracking and audit.
- **Auth:** Student (own), Faculty, Admin
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "evaluationId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "version": 2,
      "evaluatedAt": "2026-09-15T08:00:00.000Z",
      "overallScore": 84,
      "readinessScore": 83,
      "status": "COMPLETED",
      "category": "Proficient Developer"
    },
    {
      "evaluationId": "65e0f1a2b3c4d5e6f7a8b9c0",
      "version": 1,
      "evaluatedAt": "2026-09-01T12:00:00.000Z",
      "overallScore": 76,
      "readinessScore": 72,
      "status": "COMPLETED",
      "category": "Competent Developer"
    }
  ]
}
```

---

### 1.5 `POST /api/v1/ai/portfolio/evaluate`
Evaluates the student's faculty-verified portfolio directly.
- **Auth:** Authenticated Student
- **Response `200 OK`:** Returns portfolio evaluation record and component scores.

---

### 1.6 `POST /api/v1/ai/ats/analyze`
Extracts text from candidate resume PDF and computes ATS compatibility score and recommendations.
- **Auth:** Authenticated Student
- **Request Body:** `{ "resumeId": "..." }` or uploaded file multipart
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "ats_score": 86,
    "matched_keywords": ["JavaScript", "React", "Node.js", "SQL"],
    "missing_keywords": ["AWS", "CI/CD"],
    "suggestions": ["Include impact metrics in work descriptions"],
    "formatting_status": "PASS"
  }
}
```

---

### 1.7 `POST /api/v1/ai/resume/generate`
Generates a clean, machine-readable ATS-compatible PDF resume from verified portfolio records.
- **Auth:** Authenticated Student
- **Response `200 OK`:** Streamed binary PDF (`application/pdf`) with `Content-Disposition: attachment; filename="resume.pdf"`.

---

### 1.8 `POST /api/v1/ai/skills/extract` & `POST /api/v1/ai/skills/gap`
- `skills/extract`: Extracts technical skills from project titles, descriptions, and repositories.
- `skills/gap`: Takes `{ "targetRole": "Frontend Developer" }` and returns matched skills, missing skills, and coverage percentage.

---

### 1.9 `POST /api/v1/ai/github/analyze`
Deterministically evaluates synced GitHub repository count, recent commit activity, and repo diversity.
- **Auth:** Authenticated Student
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "derived_activity_score": 82,
    "public_repos": 14,
    "activity_status": "ACTIVE"
  }
}
```

---

### 1.10 `GET /api/v1/ai/recommendations` & `POST /api/v1/ai/recommendations`
Generates deterministic mentor and opportunity recommendations based on verified student skills and target interests against live database alumni and active recruiter requisitions.
- **Auth:** Authenticated Student

---

## 2. FastAPI Internal AI Service Endpoints (`ai-service`)

FastAPI runs on `http://localhost:8000` (or `AI_SERVICE_URL`). All endpoints expect and return JSON.

### 2.1 `GET /health`
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "service": "vidyalink-ai-service"
}
```

### 2.2 `POST /api/v1/portfolio/evaluate`
- **Input:**
```json
{
  "portfolio_id": "portfolio-1",
  "student_id": "student-1",
  "projects": [
    {
      "project_id": "proj-1",
      "title": "Distributed Task Engine",
      "description": "Fault-tolerant job scheduler written in Node and Redis with comprehensive test coverage.",
      "technologies": ["Node.js", "Redis", "Docker", "Jest"],
      "verified": true,
      "github_url": "https://github.com/student/task-engine",
      "deployment_url": "https://task-engine.demo.io",
      "deployment_status": "reachable"
    }
  ],
  "skills": ["Node.js", "Redis", "Docker", "JavaScript"],
  "certificates": [
    { "title": "AWS Certified Developer", "verified": true }
  ],
  "github_metrics": {
    "public_repos": 12,
    "last_synced_at": "2026-09-14T12:00:00Z"
  }
}
```
- **Output:**
```json
{
  "overall_score": 84,
  "category": "Proficient Developer",
  "component_scores": {
    "project_complexity": 85,
    "technology_stack": 80,
    "github_activity": 82,
    "documentation_quality": 88,
    "innovation": 80,
    "code_quality": 90
  },
  "weighted_breakdown": {
    "project_complexity": { "score": 85, "weight": 0.25, "contribution": 21.25 },
    "technology_stack": { "score": 80, "weight": 0.20, "contribution": 16.00 },
    "github_activity": { "score": 82, "weight": 0.15, "contribution": 12.30 },
    "documentation_quality": { "score": 88, "weight": 0.15, "contribution": 13.20 },
    "innovation": { "score": 80, "weight": 0.15, "contribution": 12.00 },
    "code_quality": { "score": 90, "weight": 0.10, "contribution": 9.00 }
  },
  "project_evaluations": [
    {
      "project_id": "proj-1",
      "title": "Distributed Task Engine",
      "overall_score": 84,
      "component_scores": {
        "project_complexity": 85,
        "technology_stack": 80,
        "github_activity": 82,
        "documentation_quality": 88,
        "innovation": 80,
        "code_quality": 90
      },
      "strengths": ["Strong architectural depth with Redis distributed lock patterns"],
      "improvements": ["Expand unit test assertions for partition tolerance"],
      "deployment_url": "https://task-engine.demo.io",
      "deployment_verified": true
    }
  ],
  "strengths": ["High-value distributed systems project"],
  "improvements": ["Include automated benchmark results in documentation"]
}
```

### 2.3 `POST /api/v1/portfolio/verify-deployment`
Performs an actual HTTP HEAD/GET probe to verify whether a project's live URL is accessible.
- **Input:** `{ "url": "https://task-engine.demo.io" }`
- **Output:**
```json
{
  "url": "https://task-engine.demo.io",
  "is_reachable": true,
  "status_code": 200,
  "response_time_ms": 145.2,
  "error": null
}
```

### 2.4 `POST /api/v1/ats/analyze`
- **Input:** `{ "resume_text": "...", "job_description": "..." }`
- **Output:** `{ "ats_score": 85, "matched_keywords": [...], "missing_keywords": [...], "suggestions": [...] }`

### 2.5 `POST /api/v1/skills/extract` & `POST /api/v1/skills/gap`
- Extracts normalized skills using domain aliases.
- Calculates role skill coverage against canonical role standards.

### 2.6 `POST /api/v1/github/analyze`
- **Input:** `{ "public_repos": 12, "last_synced_at": "...", "connection_status": "Connected" }`
- **Output:** `{ "derived_activity_score": 82, "factual_metrics": { ... } }`

### 2.7 `POST /api/v1/portfolio/readiness`
- Aggregates portfolio, skill gap, GitHub, and ATS scores into an overall readiness composite.

### 2.8 `POST /api/v1/recommendations`
- **Input:** Candidate profile, available mentors list, available recruiter opportunities list.
- **Output:** Ranked mentors and jobs with explicit match percentages and transparent matching reasons.
