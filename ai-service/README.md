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
        ├── POST /api/v1/evaluation/resume/ats      → ATS Resume Analysis Engine (5 dimensions)
        └── POST /api/v1/evaluation/github/analyze  → GitHub Analytics Observation Engine
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

## GitHub Analytics Pipeline

### Architecture

```
GitHub REST API
      │
      ▼
GitHub Service (Node.js)
      │ (Repository Sync & Analytics Calculation)
      ▼
MongoDB (GitHubRepository, GitHubAnalytics)
      │
      ▼
FastAPI AI Service (/api/v1/evaluation/github/analyze)
      │
      ▼
Portfolio Evaluation Engine (GitHub Activity Component)
```

### Endpoints

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/v1/github/connect` | `POST` | Student | Connect GitHub account by username |
| `/api/v1/github/profile` | `GET` | Student | Get connected profile metadata |
| `/api/v1/github/sync` | `POST` | Student | Synchronize profile, repositories, and calculate analytics |
| `/api/v1/github/analytics` | `GET` | Student | Fetch latest calculated GitHub analytics snapshot |
| `/api/v1/github/repositories` | `GET` | Student | List synchronized repositories |
| `/api/v1/github/repositories/:owner/:repo` | `GET` | Student | Get specific repository details |
| `/api/v1/github/verify-project/:projectId` | `POST` | Student | Verify linked project repository identity & existence |
| `/api/v1/evaluation/github/analyze` | `POST` | Internal | Normalize metrics & generate factual observations |

### Repository Verification Rules

When verifying a project repository:
1. Validates the GitHub URL format (`https://github.com/owner/repo`).
2. Calls the GitHub REST API to confirm repository existence (`repositoryExists: true/false`).
3. Compares repository owner with the student's connected GitHub account (`accountMatch: true/false`).
4. Checks recent push timestamps and activity signals (`activityDetected: true/false`).
5. **Important Principle**: Does not make unsupported claims of absolute code authorship beyond what measurable GitHub metadata establishes.

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

---

## Running Tests

```bash
# Python Microservice Tests
cd ai-service
venv\Scripts\pytest -v

# Node.js Backend Tests
cd ../server
npm test
npm run lint
```
