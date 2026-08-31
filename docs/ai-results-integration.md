# AI results integration

VidyaLink exposes the persisted AI intelligence layer through the main API. The integration layer reads results; it does not calculate, retrain, or call the AI provider when a summary is requested.

## APIs

### Student

`GET /api/v1/ai/portfolio-summary` requires a student JWT. The student ID is taken from the token. An optional `portfolioId` query parameter selects one of the authenticated student's verified portfolios; it is never accepted as a replacement for the authenticated student ID.

The response contains the latest valid `PortfolioEvaluation`, `ResumeEvaluation`, `GitHubAnalytics`, `StudentSkillProfile`, `SkillGapAnalysis`, `Recommendation`, and `IndustryReadinessEvaluation` records. Missing components are returned as `null` or an empty list, so a partial evaluation does not fail the whole response.

The component routes under `/api/v1/ai/` are read-only convenience projections of the same persisted data.

### Recruiter

`GET /api/v1/recruiter/candidates/:studentId/ai-summary` requires recruiter (or admin) authentication. It returns only recruitment-safe projections: scores, summary GitHub activity, explicitly verified portfolio skills, readiness category, strengths, and gaps. It never returns resume text, AI prompts, provider credentials, or internal breakdowns.

### Public portfolio

`GET /api/v1/ai/public/portfolio/:portfolioId/summary` returns a limited public projection only when the verified portfolio's `isPublic` flag is explicitly enabled. Public data is limited to portfolio score, industry readiness, and skills attached to the verified portfolio. Private AI analysis is never made public automatically.

Students can change that explicit opt-in through `PATCH /api/v1/portfolios/:portfolioId/visibility` with `{ "isPublic": true | false }`.

## Result lifecycle and stale state

Each result includes `evaluatedAt`, `scoringVersion`, `sourceVersion`, and `isStale`. The results service compares the evaluation timestamp with the latest relevant source update. Profile, resume, project, certificate, GitHub, and verified portfolio changes mark the affected result projection stale. Stale results remain visible for transparency, but the UI labels them and does not present them as current.

The summary endpoint does not trigger an expensive refresh. Refresh/orchestration remains the responsibility of the existing AI processing endpoints and can be requested separately later.

## Frontend behavior

`client/src/services/aiService.js` uses the shared Axios API wrapper. `VerifiedPortfolio.jsx` renders the persisted results with reusable AI cards. Loading skeletons, service errors, missing evaluations, partial results, and stale results are represented independently so one unavailable component does not hide the others.

Skill confidence is presented as evidence from analyzed sources, not as certification or a guarantee of proficiency. Recruiter and public views use their own restricted projections rather than the private student summary.
