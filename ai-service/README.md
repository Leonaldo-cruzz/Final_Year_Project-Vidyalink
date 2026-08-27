# VidyaLink AI Service

Deterministic AI/ML microservice for **VIDYALINK** — the AI-Powered Student Portfolio Verification & Recruitment Platform.

Built with **FastAPI** + **Python 3.13**, this service provides explainable, auditproof scoring engines consumed internally by the Node.js backend via HTTP.

---

## Architecture

```
Node.js Backend (Express)
        │
        ▼ HTTP (internal)
VidyaLink AI Service (FastAPI)
        │
        ├── POST /api/v1/evaluation/portfolio       → Portfolio queue
        ├── POST /api/v1/evaluation/portfolio/score → Portfolio Scoring Engine (6 dimensions)
        └── POST /api/v1/evaluation/resume/ats      → ATS Resume Analysis Engine (5 dimensions)
```

---

## Getting Started

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Docs: http://localhost:8000/docs

---

## Portfolio Scoring Engine

### Scoring Formula

`Portfolio Score = Σ (dimension_score × weight)`

| Dimension | Weight | Description |
|---|---|---|
| Project Complexity | **25%** | Architectural breadth, full-stack tiers, DB, auth, deployment |
| Technology Stack | **20%** | Modern frameworks, DB systems, cloud/DevOps, certifications |
| GitHub Activity | **15%** | Repository volume, commits, language diversity, community signals |
| Documentation Quality | **15%** | README, setup guides, API docs, architecture, demo videos |
| Innovation | **15%** | Domain specificity, advanced integrations, custom workflows |
| Code Quality | **10%** | Tests, CI/CD pipelines, linting, repo structure |

### Score Categories

| Range | Category |
|---|---|
| 90–100 | Excellent |
| 80–89.99 | Very Good |
| 70–79.99 | Good |
| 60–69.99 | Average |
| Below 60 | Needs Improvement |

---

## ATS Resume Analysis Engine

Evaluates a student's **VERIFIED** resume across 5 weighted ATS dimensions and generates a deterministic, explainable ATS compatibility score.

### Scoring Formula

`ATS Score = Σ (dimension_score × weight)`

| Dimension | Weight | What's Measured |
|---|---|---|
| Keyword Matching | **30%** | Coverage of required/preferred job keywords, general industry terminology density |
| Technical Skills | **25%** | Language, framework, database, cloud, and tool proficiencies detected and matched |
| Formatting | **20%** | Text extractability, standard ATS section headers, contact info, encoding hygiene |
| Experience | **15%** | Role titles, date ranges, action verbs, quantifiable metrics |
| Education | **10%** | Degree, institution, major/branch, graduation year |

### Score Categories (identical to Portfolio)

| Range | Category |
|---|---|
| 90–100 | Excellent |
| 80–89.99 | Very Good |
| 70–79.99 | Good |
| 60–69.99 | Average |
| Below 60 | Needs Improvement |

### Scoring Version

All ATS evaluations are stamped with `scoringVersion: "1.0"`.

### Design Principles

- **Deterministic**: Same input always produces the same score. No LLM randomness.
- **Explainable**: Every dimension includes `evidence[]` (measurable facts) and `explanation` (human-readable rationale).
- **Transparent**: Exact weights, criteria, and evidence are returned in the API response.
- **Clamped**: Final score is always in `[0, 100]`.
- **Privacy-first**: Raw resume text is never logged. No external APIs called for scoring.
- **Verified-only**: Only resumes with `verificationStatus: "VERIFIED"` are evaluated.

### API Contract

**Request** `POST /api/v1/evaluation/resume/ats`

```json
{
  "studentId": "string",
  "portfolioId": "string",
  "verificationStatus": "VERIFIED",
  "resume": {
    "text": "Plain text resume content",
    "fileContentBase64": "base64-encoded PDF",
    "mimeType": "application/pdf",
    "fileName": "resume.pdf"
  },
  "targetJob": {
    "title": "Backend Engineer",
    "description": "...",
    "requiredSkills": ["python", "fastapi", "postgresql"],
    "preferredSkills": ["docker", "aws"]
  }
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "atsScore": 78.5,
    "category": "Good",
    "breakdown": {
      "keywordMatching": { "score": 75.0, "weight": 30, "weightedScore": 22.5, "evidence": [...], "explanation": "..." },
      "formatting":      { "score": 80.0, "weight": 20, "weightedScore": 16.0, "evidence": [...], "explanation": "..." },
      "technicalSkills": { "score": 85.0, "weight": 25, "weightedScore": 21.25, "evidence": [...], "explanation": "..." },
      "experience":      { "score": 70.0, "weight": 15, "weightedScore": 10.5, "evidence": [...], "explanation": "..." },
      "education":       { "score": 85.0, "weight": 10, "weightedScore": 8.5, "evidence": [...], "explanation": "..." }
    },
    "matchedSkills": ["python", "fastapi"],
    "missingSkills": ["kubernetes"],
    "missingKeywords": [],
    "detectedSections": ["Contact", "Summary", "Skills", "Experience", "Projects", "Education", "Certifications"],
    "recommendations": ["Include quantifiable metrics in bullet points.", "Add a dedicated Projects section."],
    "scoringVersion": "1.0",
    "evaluatedAt": "2026-08-27T06:40:00.000000+00:00"
  }
}
```

### Limitations (v1.0)

- Does not perform deep semantic / vector embedding analysis (no LLM calls).
- Keyword matching is token-based; synonym or concept matching is not supported.
- PDF extraction depends on text-layer PDF; scanned images are not OCR'd.
- Target job matching is lexical; no concept weighting or NLP inference.

---

## Resume Text Extraction

| Input Method | Supported |
|---|---|
| Plain text (`text` field) | ✅ |
| Base64-encoded PDF (`fileContentBase64`) | ✅ |
| Base64-encoded plain text | ✅ |
| Data URL prefix (`data:application/pdf;base64,...`) | ✅ |
| Scanned PDF (image-only) | ❌ (v1.0) |

---

## Running Tests

```bash
cd ai-service
venv/Scripts/pytest -v        # Windows
venv/bin/pytest -v             # macOS/Linux
```

All 90 tests must pass: **90/90 ✅**

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `AI_SERVICE_HOST` | `0.0.0.0` | Service bind host |
| `AI_SERVICE_PORT` | `8000` | Service port |
| `BACKEND_BASE_URL` | `http://localhost:5000` | Node.js backend URL |

Copy `.env.example` → `.env` and configure for your environment.

---

## Module Structure

```
ai-service/
├── app/
│   ├── main.py                    # FastAPI app, middleware, exception handlers
│   ├── config.py                  # Pydantic-settings typed config
│   ├── routes/
│   │   ├── health.py              # GET /health
│   │   └── evaluation.py          # POST /api/v1/evaluation/portfolio/score
│   │                              # POST /api/v1/evaluation/resume/ats
│   ├── schemas/
│   │   └── evaluation.py          # All Pydantic request/response models
│   ├── services/
│   │   ├── scoring/               # 6-dimension Portfolio Scoring Engine
│   │   │   ├── portfolio_scorer.py
│   │   │   ├── project_complexity.py
│   │   │   ├── technology_stack.py
│   │   │   ├── github_activity.py
│   │   │   ├── documentation_quality.py
│   │   │   ├── innovation.py
│   │   │   ├── code_quality.py
│   │   │   └── score_categories.py
│   │   ├── resume/                # Resume Parsing & Extraction
│   │   │   ├── text_extractor.py
│   │   │   ├── normalizer.py
│   │   │   └── parser.py
│   │   └── ats/                   # ATS Resume Analysis Engine
│   │       ├── config.py
│   │       ├── section_detector.py
│   │       ├── keyword_analyzer.py
│   │       ├── skills_analyzer.py
│   │       ├── experience_analyzer.py
│   │       ├── education_analyzer.py
│   │       ├── formatting_analyzer.py
│   │       └── ats_scorer.py
│   └── clients/
│       └── backend_client.py      # HTTP client for Node.js backend
└── tests/
    ├── test_resume_parser.py      # Resume extraction & normalization tests
    ├── test_ats_scoring.py        # ATS unit tests + Strong > Average > Weak invariants
    └── test_ats_endpoint.py       # FastAPI integration tests
```
