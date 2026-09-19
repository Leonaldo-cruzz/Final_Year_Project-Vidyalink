# VidyaLink — AI Subsystem Architecture & System Documentation

## 1. Overview

The VidyaLink AI Subsystem is a **deterministic, evidence-driven evaluation engine** designed to provide fair, reproducible, and verifiable academic portfolio evaluations for higher education students. 

### Core Invariants
1. **Zero Synthetic / Mock Runtime Data:** All scores, skills, matched mentors, and readiness indicators are computed from genuine database records or explicit reachability probes. If evidence is absent, the system displays an explicit empty/unavailable state.
2. **Faculty Primacy:** AI evaluations are strictly **advisory**. AI cannot approve, verify, or certify projects; verification authority belongs exclusively to accredited faculty.
3. **Strict Network Architecture:** The React client communicates only with the Node.js Express backend (`/api/v1/ai/*`). The Node.js server acts as an authorized gateway to the internal FastAPI AI service (`http://localhost:8000`).
4. **Immutable Historical Snapshots:** Every full evaluation run is recorded in `AIEvaluation` with a self-contained snapshot of all component analyses, content hash, and an incremented version number.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React Client (Vite)                                        │
│  - /student/ai-insights  (AIInsights.jsx)                   │
│  - /faculty/verifications/:id  (VerificationDetail.jsx)     │
│  - /recruiter/applicants  (ApplicantManagement.jsx)         │
│  - /recruiter/dashboard   (RecruiterDashboard.jsx)          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / Axios (JWT Bearer Token)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Node.js Backend Gateway (Express / Mongoose)               │
│  - routes/ai.routes.js                                      │
│  - controllers/ai.controller.js                             │
│  - services/aiOrchestrator.service.js  (Workflow pipeline)  │
│  - services/aiIntegration.service.js   (Data resolution)    │
│  - services/ai.service.js              (FastAPI HTTP client)│
│  - services/resume.service.js          (PDF generation)     │
└──────────────────────────┬──────────────────────────────────┘
                           │ Internal HTTP (Bounded 15s Timeout)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI AI Service (Python / Pydantic)                     │
│  - portfolio_scoring.py       - deployment_verification.py  │
│  - ats_analyzer.py            - skill_analysis.py           │
│  - github_analytics.py        - readiness.py                │
│  - recommendation_engine.py                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Official Portfolio Scoring Model & Weights

The portfolio evaluation algorithm aggregates individual verified project evaluations into an evidence-weighted composite score ($0–100$) using the official distribution:

$$\text{Overall Score} = \sum (\text{Component Score} \times \text{Official Weight})$$

| Component Dimension | Official Weight | Evaluation Basis |
|---|:---:|---|
| **Project Complexity** | **25%** | Microservice/distributed architecture, database schema depth, API endpoints, backend logic. |
| **Technology Stack** | **20%** | Modern language/framework adoption, full-stack integration, Docker/cloud tools. |
| **GitHub Activity** | **15%** | Factual repository metrics, commit regularity, multi-repo participation. |
| **Documentation Quality**| **15%** | Project overview completeness, installation guides, API references, architecture notes. |
| **Innovation & Problem-Solving**| **15%** | Real-world problem domains, unique algorithm implementation, external API integrations. |
| **Code Quality & Testing** | **10%** | Test coverage (unit/integration), modular structure, linters/formatting, clean separation. |

### Project-Level Evaluations
Each verified project in the portfolio receives an individual `ProjectEvaluation` record containing:
- Specific scores for all 6 dimensions
- Identified strengths and actionable improvement areas
- Real-time live deployment URL verification status

---

## 4. Live Deployment Verification Service

VidyaLink actively probes live application deployments via `POST /api/v1/portfolio/verify-deployment`:
- **Protocol:** Real HTTP `HEAD` request (falling back to `GET` on 405 Method Not Allowed) using `httpx.Client`.
- **Redirects & Safety:** Follows up to 5 redirects with an 8-second bounded timeout.
- **Data Truth:** Reports real HTTP status codes (e.g. `200`, `404`, `503`) and response times in milliseconds.

---

## 5. ATS Resume Processing & Machine-Readable Generation

1. **Text Extraction & Keyword Analysis (`POST /api/v1/ai/ats/analyze`):**
   - Ingests uploaded PDF resumes via `pdf-parse`.
   - Computes keyword density against target technical roles.
   - Highlights matched keywords, missing keywords, and section formatting compliance.
2. **ATS-Compatible Resume Generator (`POST /api/v1/ai/resume/generate`):**
   - Synthesizes student academic profile, verified faculty-approved projects, and verified credentials into a clean PDF stream.
   - Verified credentials are explicitly tagged with `[Faculty Verified]`.
   - Formatted in clean single-column Helvetica typography with guaranteed text extractability (tested with `pdf-parse`).
   - Strict filter removes any `undefined`, `null`, or synthetic filler text.

---

## 6. Industry Readiness Composite Index

The readiness score ($0–100$) synthesizes four balanced dimensions:
- **Portfolio Health:** 35%
- **Skill Breadth & Coverage:** 25%
- **GitHub Practical Activity:** 20%
- **ATS Resume Quality:** 20%

If any optional dimension is unavailable (e.g. no GitHub account linked), the index calculates an honest score based strictly on available evidence and flags missing modules.

---

## 7. Recommendation & Matching Engine

- **Alumni Mentorship Matching:** Matches students with verified alumni mentors based on shared technical skills, academic branch, and industry focus. Returns transparent match scores and human-readable reasoning.
- **Recruiter Opportunity Matching:** Matches candidates to open recruiter project requisitions, highlighting matched skills and pinpointing exact skill gaps.
- **Zero Hallucination:** Only real database records from the `User` and `Project` collections are matched. If no candidate qualifies, returns an empty array.

---

## 8. Observability & Telemetry

Safe duration and status logging is enabled across all evaluation stages:
```
[AI_OBSERVABILITY] START evaluation studentId=... portfolioId=...
[AI_OBSERVABILITY] STAGE portfolio status=available durationMs=45
[AI_OBSERVABILITY] STAGE skills_extract status=available durationMs=12
[AI_OBSERVABILITY] STAGE github status=available durationMs=8
[AI_OBSERVABILITY] STAGE ats status=available durationMs=25
[AI_OBSERVABILITY] STAGE readiness status=available durationMs=6
[AI_OBSERVABILITY] STAGE recommendations status=available durationMs=18
[AI_OBSERVABILITY] END evaluation studentId=... portfolioId=... status=COMPLETED totalDurationMs=114
```
All logs exclude sensitive PII, passwords, and raw resume contents.

---

## 9. Evaluation Lifecycle & State Machine

```
   ┌───────────────────┐
   │   NOT_EVALUATED   │
   └─────────┬─────────┘
             │ Verified Portfolio Exists
             ▼
   ┌───────────────────┐
   │     ELIGIBLE      │
   └─────────┬─────────┘
             │ User Clicks "Run AI Analysis"
             ▼
   ┌───────────────────┐
   │      RUNNING      │
   └─────────┬─────────┘
             ├──────────────────────────┐
             │ All succeeded            │ Core succeeded, optional failed
             ▼                          ▼
   ┌───────────────────┐      ┌───────────────────┐
   │     COMPLETED     │      │      PARTIAL      │
   └─────────┬─────────┘      └─────────┬─────────┘
             │                          │
             └───────────┬──────────────┘
                         │ Source Portfolio or Projects Modified
                         ▼
               ┌───────────────────┐
               │       STALE       │
               └───────────────────┘
```
