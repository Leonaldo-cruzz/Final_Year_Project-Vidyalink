# VidyaLink unified AI pipeline

VidyaLink has one evidence-backed AI workflow:

```text
faculty-verified portfolio
  → verified evidence collection
  → portfolio evaluation
  → skill extraction
  → GitHub analytics (optional)
  → ATS analysis (optional)
  → skill gap (when a target role/required skills are supplied)
  → readiness
  → recommendations (student-only, actual stored entities)
```

The React client calls Node/Express only. Node enforces the authenticated user’s scope, reads MongoDB records, sends bounded requests to FastAPI, validates each response, and persists history. FastAPI does not receive credentials and cannot create users, jobs, certificates, or portfolio evidence.

## Unified endpoints

- `POST /api/v1/ai/evaluate` runs the available pipeline. Body fields are `portfolioId` for scoped non-student access, `force` for explicit re-evaluation, and optional `targetRole` / `requiredSkills` for skill-gap analysis.
- `GET /api/v1/ai/results/latest` returns the current `AIProfile`-shaped read model.
- `GET /api/v1/ai/results` returns the current read model and evaluation history.
- Existing specialized routes remain available for targeted workflows and backwards compatibility.

The unified read model contains `studentId`, `portfolioId`, `evaluation`, `skills`, `skillGaps`, `github`, `ats`, `readiness`, `recommendations`, `lastUpdated`, `evaluationVersion`, `dataCompleteness`, `componentStatus`, and a source fingerprint.

## Lifecycle and honest states

The orchestrator uses these states:

`NOT_EVALUATED`, `ELIGIBLE`, `EVALUATING`, `COMPLETED`, `PARTIAL`, `INSUFFICIENT_EVIDENCE`, `FAILED`, and `STALE`.

`PARTIAL` is expected when a verified portfolio exists but an optional source is missing, such as no connected GitHub account or no readable stored resume. Missing components are returned as `null` with an explicit component status; they are never converted into zeroes or fallback scores. A portfolio evaluation remains visible if a later optional component fails.

`STALE` is calculated by comparing a SHA-256 fingerprint of the verified portfolio, project, profile, resume metadata, GitHub snapshot, and verified certificates with the fingerprint saved on the last evaluation. The UI tells the user that the portfolio changed and exposes Re-evaluate.

## Persistence and idempotency

`AIEvaluation` stores the portfolio score plus `evaluationVersion`, `contentHash`, `sourceUpdatedAt`, `evaluationStatus`, and per-component pipeline status. `AIAnalysis` stores the same source/version metadata for each analysis type. Identical source fingerprints return the existing evaluation without creating a duplicate. An explicit `force: true` request creates a new history version; previous versions remain queryable with their score, readiness score when available, source timestamp, and status.

## Access rules

- Students can read and evaluate only their own portfolio.
- Faculty and administrators can inspect scoped student records allowed by the existing application rules.
- Recruiters can inspect AI summaries only for their candidates; the API does not expose arbitrary student records.
- Faculty verification and AI assistance are displayed separately. AI output never changes a verification record.

## Bounded execution

Each FastAPI request has `AI_SERVICE_TIMEOUT`. The complete synchronous orchestration has `AI_ORCHESTRATION_TIMEOUT` (default `90000` ms). Component calls run independently, and a timeout returns `FAILED` without storing a fabricated result.

## Frontend surfaces

`/ai-insights` is the unified student-facing view. It fetches the latest read model, shows one summary card, honest unavailable/partial states, data completeness, source/version metadata, and history. The verified portfolio page uses the same latest-result endpoint and no longer fans out to independent evaluation/readiness requests.

The page labels output as AI-assisted. Faculty verification remains authoritative, while recruiter-facing application summaries show only stored evaluation data or `Not evaluated`.
