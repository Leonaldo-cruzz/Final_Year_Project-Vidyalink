# VidyaLink — AI Service & Portfolio Evaluation Engine

> High-performance, explainable, and deterministic AI microservice for VidyaLink student portfolio evaluation, scoring, ATS readiness, and verification analytics.

---

## 1. Overview & Architecture

The VidyaLink AI Service is an asynchronous microservice built using **FastAPI** and **Pydantic v2**. It calculates a transparent, deterministic, and explainable **Portfolio Score (0–100)** with comprehensive evidence breakdowns across 6 weighted dimensions.

### Data Flow & Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Client                           │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Authenticated HTTP)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Express Backend (Node.js)                                   │
│  - Authenticates student                                    │
│  - Loads portfolio & verification records directly from DB  │
│  - Asserts 'VERIFIED' status via VerificationService        │
│  - Constructs server-verified evaluation payload            │
│  - Calls FastAPI with strict timeout & error handling       │
│  - Persists historical score in PortfolioEvaluation model   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Internal REST / JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ FastAPI AI Service (:8000)                                  │
│  ├── /health                                                │
│  ├── /api/v1/evaluation/portfolio                           │
│  └── /api/v1/evaluation/portfolio/score                     │
│        ├── projectComplexity      (25%)                     │
│        ├── technologyStack        (20%)                     │
│        ├── githubActivity         (15%)                     │
│        ├── documentationQuality   (15%)                     │
│        ├── innovation             (15%)                     │
│        └── codeQuality            (10%)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Scoring Formula & Weights

The portfolio score is calculated using the following deterministic formula:

$$\text{Portfolio Score} = \sum (\text{Dimension Score} \times \text{Weight})$$

$$\begin{aligned}
\text{Portfolio Score} &= (\text{Project Complexity} \times 0.25) \\
&+ (\text{Technology Stack} \times 0.20) \\
&+ (\text{GitHub Activity} \times 0.15) \\
&+ (\text{Documentation Quality} \times 0.15) \\
&+ (\text{Innovation} \times 0.15) \\
&+ (\text{Code Quality} \times 0.10)
\end{aligned}$$

The final score is clamped between **0.00** and **100.00** and rounded to two decimal places.

| Dimension | Weight | Primary Criteria |
| :--- | :---: | :--- |
| **Project Complexity** | **25%** | Architecture tiers (Frontend + Backend), Database usage, Authentication/RBAC, Live deployments, Multi-member collaboration, Scope depth. |
| **Technology Stack** | **20%** | Diversity of active tools/frameworks, Modern client/server pairing, Cloud/DevOps infrastructure, Verified certifications. |
| **GitHub Activity** | **15%** | Public repository volume, Commit history volume, Polyglot language breadth, Community engagement (stars/forks), Activity recency. |
| **Documentation Quality**| **15%** | Dedicated README, Setup & installation instructions, Architecture/system design docs, API endpoint specs, Demo video walkthroughs. |
| **Innovation** | **15%** | Domain problem specificity (FinTech, EdTech, Healthcare, etc.), Non-trivial integrations (WebSockets, Payment, LLMs), Real-world deployment impact. |
| **Code Quality** | **10%** | Automated testing suites, Recorded test coverage percentage, Linting / static hygiene status, CI/CD automated pipeline build status. |

---

## 3. Score Category Classifications

| Range | Classification | Meaning |
| :--- | :--- | :--- |
| **90.00 – 100.00** | `Excellent` | Production-grade portfolio with rich documentation, testing, CI/CD, and live deployment. |
| **80.00 – 89.99** | `Very Good` | Strong full-stack implementation with clean structure and verified technical skills. |
| **70.00 – 79.99** | `Good` | Solid core application with working functionality and standard documentation. |
| **60.00 – 69.99** | `Average` | Foundational implementation meeting baseline project requirements. |
| **< 60.00** | `Needs Improvement` | Incomplete metadata, missing testing/documentation, or unverified project scope. |

---

## 4. API Endpoints

### 4.1 Health Check
- **Route**: `GET /health`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "service": "vidyalink-ai",
    "status": "healthy"
  }
  ```

---

### 4.2 Portfolio Evaluation Score
- **Route**: `POST /api/v1/evaluation/portfolio/score`
- **Description**: Evaluates verified student portfolio metadata across 6 weighted dimensions.
- **Rule**: Rejects requests if `verificationStatus != "VERIFIED"`.

#### Sample Request

```json
{
  "studentId": "651f8a7e3b1c9d0012a45678",
  "portfolioId": "651f8b1e3b1c9d0012a45679",
  "verificationStatus": "VERIFIED",
  "skills": ["React", "TypeScript", "Node.js", "FastAPI", "MongoDB", "Docker", "AWS"],
  "projects": [
    {
      "title": "VidyaLink AI Recruitment Engine",
      "description": "Enterprise multi-tier platform with automated verification.",
      "detailedDescription": "Designed full-stack system with JWT authentication and automated scoring.",
      "technologies": ["React", "TypeScript", "Node.js", "FastAPI", "MongoDB", "Docker", "AWS", "WebSockets"],
      "category": "EdTech",
      "domain": "EdTech",
      "githubRepository": "https://github.com/example/vidyalink",
      "liveDeployment": "https://vidyalink.example.com",
      "demoVideo": "https://youtube.com/watch?v=demo123",
      "documentation": {
        "readme": "Comprehensive README with architecture diagrams.",
        "setupInstructions": "docker compose up -d",
        "architectureDocumentation": "Microservice interaction overview.",
        "apiDocumentation": "OpenAPI v3 REST specs."
      },
      "codeQuality": {
        "testStatus": "PASSED",
        "hasTests": true,
        "coveragePercentage": 88.5,
        "lintStatus": "PASSED",
        "ciStatus": "PASSED"
      }
    }
  ],
  "certificates": [
    {
      "title": "AWS Certified Solutions Architect",
      "issuer": "Amazon Web Services",
      "issueDate": "2025-01-10"
    }
  ],
  "github": {
    "repositoryCount": 15,
    "commitCount": 350,
    "contributionActivity": 120,
    "languages": ["TypeScript", "Python", "JavaScript"],
    "stars": 25,
    "forks": 8,
    "readmePresent": true,
    "lastActivity": "2026-08-25T10:00:00Z"
  },
  "resume": {
    "summary": "Full-stack cloud engineer with internship experience in scalable systems."
  }
}
```

#### Sample Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "portfolioScore": 88.25,
    "category": "Very Good",
    "breakdown": {
      "projectComplexity": {
        "score": 85.0,
        "weight": 25,
        "weightedScore": 21.25,
        "evidence": [
          "Portfolio contains 1 verified project(s).",
          "Full-stack architecture verified (Frontend + Backend components detected).",
          "Data persistence layer verified (Database/ORM integration detected).",
          "Access control / Authentication mechanisms integrated.",
          "Live production deployment URL verified.",
          "Demo video walkthrough provided.",
          "Public / accessible source code repository linked.",
          "Multi-faceted stack integration (Project uses 8 distinct technologies)."
        ],
        "explanation": "Project complexity evaluated at 85.0/100 across 1 project(s), factoring architectural tiers, data persistence, authentication, and deployment readiness."
      },
      "technologyStack": {
        "score": 90.0,
        "weight": 20,
        "weightedScore": 18.0,
        "evidence": [
          "Detected 7 distinct technical competencies across verified projects and skills.",
          "High technology diversity with 6+ active tools/frameworks.",
          "Modern full-stack pairing detected across client and server tiers.",
          "Enterprise data persistence verified (mongodb).",
          "DevOps/Cloud skills detected (docker, aws).",
          "1 verified professional technical certificate(s) included."
        ],
        "explanation": "Technology stack scored at 90.0/100 based on coverage across frontend, backend, database systems, DevOps infrastructure, and certified competencies."
      },
      "githubActivity": {
        "score": 88.0,
        "weight": 15,
        "weightedScore": 13.2,
        "evidence": [
          "Substantial repository portfolio (15 public repositories).",
          "High continuous development activity (470 recorded commits/contributions).",
          "Strong community recognition (25 stars, 8 forks).",
          "Multi-language repository activity (3 languages).",
          "Profile or repository README documentation verified.",
          "Recent development activity timestamp confirmed."
        ],
        "explanation": "GitHub activity scored at 88.0/100 based on repository volume, commit frequency, language breadth, and public collaboration signals."
      },
      "documentationQuality": {
        "score": 95.0,
        "weight": 15,
        "weightedScore": 14.25,
        "evidence": [
          "Basic project description present.",
          "Complete README and explicit setup/installation instructions verified.",
          "System architecture / technical design documentation supplied.",
          "API documentation with endpoints/schemas detailed.",
          "Interactive video demonstration walkthrough linked."
        ],
        "explanation": "Documentation quality scored at 95.0/100 based on README presence, setup guides, architecture clarity, API specifications, and walk-through resources."
      },
      "innovation": {
        "score": 88.0,
        "weight": 15,
        "weightedScore": 13.2,
        "evidence": [
          "Specialized domain focus verified in: Educational Technology.",
          "Advanced system capability integrated (Real-time WebSockets communication, Containerized multi-service deployment).",
          "Deployed working solution provides verifiable live user impact."
        ],
        "explanation": "Innovation and technical depth scored at 88.0/100 based on problem domain specificity, advanced subsystem integrations, custom logic, and live implementation."
      },
      "codeQuality": {
        "score": 83.5,
        "weight": 10,
        "weightedScore": 8.35,
        "evidence": [
          "Comprehensive automated test suite with >=70% test coverage verified.",
          "CI/CD automated build / validation pipeline configured.",
          "Automated linting hygiene / zero-warning status verified.",
          "Structured version control management verified."
        ],
        "explanation": "Code quality scored at 83.5/100 based on verified automated tests, CI/CD automation, linting status, and repository hygiene metrics."
      }
    },
    "evaluatedAt": "2026-08-27T12:00:00.000Z",
    "version": "1.0"
  }
}
```

---

## 5. Versioning & Traceability

The evaluation engine is stamped with `scoringVersion: "1.0"`. When scoring rules or weights evolve in future versions, past student evaluations remain fully auditable and traceable to their exact evaluated version in the database (`PortfolioEvaluation` model).

---

## 6. Limitations of Version 1.0 & Future ML/LLM Roadmap

### Limitations in Version 1.0:
- Relies on structured metadata supplied by verified portfolio models rather than live AST/static source code parsing.
- Uses rule-based NLP keyword extraction for domain categorization rather than continuous embeddings.
- ATS compatibility and deep code complexity are reserved for dedicated downstream modules.

### Future ML / LLM Roadmap:
1. **Gemini / OpenAI Semantic Scoring Plugin**: Natural language assessment of project problem statements and architecture design depth.
2. **Deep GitHub AST & Git History Mining**: Automated static analysis (Cyclomatic Complexity, Maintainability Index, Commit Velocity).
3. **ATS Resume Parser & Skill Gap Recommendation Engine**: Automated job requirement matching and student readiness trajectory scoring.

---

## 7. Running Tests

```bash
# AI Service Pytest Suite
pytest -v tests

# Node Backend Vitest Suite
cd ../server
npm test
```
