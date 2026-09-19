# VidyaLink — AI Subsystem Testing Documentation

## Testing Architecture

The VidyaLink AI subsystem is verified across three independent test tiers, ensuring complete functional correctness, deterministic behavior, and strict data truth with zero mock/fake data in production paths.

```
                    ┌────────────────────────────┐
                    │   Client Vitest Suite      │
                    │   63 tests / 7 files       │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   Node Backend Test Suite  │
                    │   50 tests / 7 suites      │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   FastAPI Pytest Suite     │
                    │   38 tests / 9 suites      │
                    └────────────────────────────┘
```

---

## 1. FastAPI AI Service Pytest Suite (`ai-service/tests/`)

### Test Coverage (38 passed tests)
- **`tests/test_portfolio_scoring.py`**:
  - Official scoring weights validation: Project Complexity 25%, Tech Stack 20%, GitHub Activity 15%, Documentation Quality 15%, Innovation 15%, Code Quality 10%.
  - Component contribution calculation and rounding.
  - Project-level evaluation (`evaluate_project`) returning individual scores, strengths, and improvements.
  - Multi-project aggregation and portfolio score synthesis.
- **`tests/test_deployment_verification.py`**:
  - Empty or non-HTTP URL handling (returns `is_reachable: false`).
  - Reachable deployment test (mocked HTTP 200).
  - Unreachable deployment test (mocked HTTP 503/404).
  - Timeout and connection failure safety (8s timeout boundary).
  - FastAPI route validation (`POST /api/v1/portfolio/verify-deployment`).
- **`tests/test_portfolio.py`**:
  - Empty portfolio evidence handling.
  - Multi-project verification and qualitative categorization.
- **`tests/test_ats.py`**:
  - ATS resume keyword extraction and scoring.
  - Actionable feedback and formatting recommendations.
- **`tests/test_skills.py`**:
  - Canonical skill extraction from raw project text.
  - Skill gap analysis across standardized target roles.
- **`tests/test_github.py`**:
  - Deterministic activity scoring from factual metrics (repo counts, sync timestamps).
- **`tests/test_readiness.py`**:
  - Industry readiness composite aggregation from existing evidence.
- **`tests/test_recommendations.py`**:
  - Alumni mentor matching with skill overlap and transparent justification.
  - Opportunity matching with matched and missing skill sets.
  - Empty candidate and non-overlapping candidate edge cases.
- **`tests/test_health.py`**:
  - Service health endpoint check (`/health`).

### Execution Command
```bash
cd ai-service
python -m pytest
```

---

## 2. Node Backend Test Suite (`server/test/`)

### Test Coverage (50 passed tests)
- **`server/test/ai.orchestrator.test.js`**:
  - Full end-to-end multi-stage pipeline run producing a unified profile.
  - Missing GitHub or resume producing honest partial status without synthetic fallback data.
  - Gated evaluation: unverified portfolio produces `INSUFFICIENT_EVIDENCE` without invoking upstream AI.
  - Deduplication via `contentHash` and explicit re-evaluation creating historical versions.
  - Stale state detection when source portfolio is edited after evaluation.
  - Partial failure isolation: sub-component failures mark the run as `PARTIAL` while preserving portfolio results.
  - Historical snapshots via `getHistory` returning formatted versions and readiness scores.
- **`server/test/ai.service.test.js`**:
  - AI health status check without leaking credentials or environment configs.
  - Graceful handling of AI service downtime (converts upstream failure to non-throwing gateway error).
  - Schema validation of portfolio evaluation response.
  - Immediate rejection of malformed AI responses before persistence.
  - Bounded 15s timeout mapping to gateway timeout.
  - Upstream 4xx/5xx HTTP errors properly translated.
  - Student portfolio ownership verification.
- **`server/test/ai.recommendations.test.js`**:
  - Authenticated recommendation generation from real database users and opportunities.
  - Rejection of unauthorized roles (e.g., recruiter attempting student recommendation endpoint).
  - Proper scoping to authenticated student context.
  - Prevention of IDOR: student cannot access another student's recommendations.
  - Transparent match scores and reasoning fields.
- **`server/test/resume_pdf_validation.test.js`**:
  - Generates real PDF buffer using `ResumeService.generateResumePDF`.
  - Parses text stream with `pdf-parse`.
  - Verifies extracted text is machine-readable, selectable, and searchable.
  - Validates required section headers (`EDUCATION`, `SKILLS`, `PROJECTS`, `WORK EXPERIENCE`).
  - Asserts complete absence of corruption tokens: `undefined`, `null`, `[object Object]`, `NaN`.
- **`server/test/resume.service.test.js`**:
  - Resume text generation from verified academic records.
  - Omission of empty optional fields with zero placeholder strings.
  - Section exclusion toggles.
  - Verified vs unverified credential labels.
  - ATS validator contract checking boundary conditions.
- **`server/test/verification_workflow.test.js`**:
  - Verification submission creating pending records and notifications.
  - Conflict on duplicate pending verification requests.
  - Faculty request-changes workflow.
  - Faculty approval updating project status to `VERIFIED` and generating portfolio.
- **`server/test/services.test.js`**:
  - Notification tracking, unread count, mark-as-read.
  - Mentorship requests and alumni acceptance flow.
  - Campus referral creation.
  - Forgot password / reset password secure SHA-256 tokens.

### Execution Command
```bash
node --test server/test/*.test.js
```

---

## 3. Client Vitest Test Suite (`client/src/pages/__tests__/`)

### Test Coverage (63 passed tests across 7 test files)
- **`ResumePipeline.test.jsx`** (8 tests):
  - Honest empty state with zero fake resume filenames or scores.
  - Real generated resume display with genuine ATS score.
  - Uploaded resume with no ATS showing honest "No ATS" state.
  - Stale banner display when underlying portfolio updates.
- **`AIInsightsPanelStates.test.jsx`** (10 tests):
  - State rendering across `NOT_EVALUATED`, `ELIGIBLE`, `RUNNING`, `COMPLETED`, `PARTIAL`, `STALE`, and `UNAVAILABLE`.
  - Project-level evaluation display with verified badges and component breakdowns.
- **`EmptyStatesAndDataTruth.test.jsx`** (6 tests):
  - Zero-state data truth across all student dashboards.
- **`ProjectsPageDataTruth.test.jsx`** (9 tests):
  - Verification status badges and data-driven portfolio rendering.
- **`VerificationLifecycle.test.jsx`** (14 tests):
  - Verification lifecycle UI across student, faculty, and recruiter perspectives.
- **`AuthContext.test.jsx`** (10 tests) & **`api.test.js`** (6 tests):
  - Authentication flow, token management, and Axios interceptor integrity.

### Execution Command
```bash
cd client
npm test -- --run
```

---

## 4. Lint and Static Analysis Verification

Both frontend and backend codebases pass strict ESLint audits with zero errors and zero warnings:

```bash
npm run lint
```
*Output: All workspaces pass with max-warnings 0.*
