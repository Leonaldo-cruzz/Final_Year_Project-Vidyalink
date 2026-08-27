# Recommendation Engine

## Scope

This deterministic engine produces assistive recommendations for a student; it
does not calculate an Industry Readiness Score, rank applicants for recruiters,
make hiring decisions, train models, or provide a frontend UI.

Recommendation types are `ALUMNI_MENTOR`, `RECRUITER_OPPORTUNITY`,
`SKILL_IMPROVEMENT`, `PROJECT_IMPROVEMENT`, and `RESUME_IMPROVEMENT`.

## Data and privacy

`POST /api/v1/recommendations/*` accepts the established request shape, but
Express uses only `studentId` to verify the authenticated student. It discards
browser supplied skills, scores, projects, and gaps, then builds an input from
MongoDB records: profile, student profile, projects, certificates, portfolios,
resume, and GitHub connection.

An alumni mentor is eligible only when the account is active and email-verified,
and their explicit `mentorProfile.available` and
`mentorProfile.visibility = public` settings permit it. A recruiter opportunity
is eligible only when it is owned by an active, email-verified recruiter and is
explicitly marked `opportunity.isOpen` and `opportunity.visibility = public`.
The service sends only IDs and matching fields to FastAPI. API results never
contain candidate emails, phones, passwords, or full private profiles.

Current data has no persisted ATS-analysis result, so `atsScore` is deliberately
`null`; the engine never fabricates a low-ATS recommendation. The same rule
applies to all improvements: each reason names an observed data gap.

## Matching and scoring

All weights live in `ai-service/app/services/recommendation/scoring.py`.

| Match | Signals | Weights |
| --- | --- | --- |
| Alumni mentor | skill overlap, domain, interests, portfolio evidence, experience | 40%, 20%, 15%, 15%, 10% |
| Recruiter opportunity | required/preferred skills, domain, portfolio, verification, experience | 40%, 15%, 15%, 15%, 10%, 5% |

Signals are normalized, exact token coverage. The small documented alias map
handles examples such as `ReactJS → React`, `Node JS → Node.js`, and
`Amazon Web Services → AWS`. There is no semantic embedding fallback or
heavyweight model. Scores are clamped to 0–100; ties are ordered by target ID,
which makes ranking repeatable.

Improvement actions use explicit evidence only: opportunity skills absent from
the student profile, no project, missing documentation/evidence, no resume,
stored low ATS score (when one exists), no connected/public GitHub activity, or
no verified certificate.

Every returned recommendation includes an entity ID, score, non-empty reasons,
matched and missing skills, priority, `generatedAt`, and `algorithmVersion`.
`algorithmVersion` is `1.0`. Because no embedding/model is used, no
`modelVersion` is stored in this version.

## API and caching

All routes require an authenticated `student` role:

- `GET /api/v1/recommendations` returns only active persisted results.
- `POST /api/v1/recommendations/alumni`
- `POST /api/v1/recommendations/recruiters`
- `POST /api/v1/recommendations/improvements`
- `POST /api/v1/recommendations/refresh` accepts optional `scopes` and explicitly recomputes.
- `PATCH /api/v1/recommendations/:id/dismiss`
- `PATCH /api/v1/recommendations/:id/accept`

Results are persisted in `Recommendation`; a `RecommendationRun` cache marker
also persists empty result sets. The configured TTL is 24 hours by default
(`RECOMMENDATION_CACHE_TTL_MS`). Refresh replaces active cached results while
preserving accepted and dismissed records as user-action history.

## Example

```json
{
  "entityId": "66ca...",
  "type": "ALUMNI_MENTOR",
  "matchScore": 91.5,
  "reasons": ["Strong React, Node.js skill overlap", "Alumni expertise matches your project domain"],
  "matchedSkills": ["node.js", "react"],
  "missingSkills": [],
  "priority": "HIGH",
  "algorithmVersion": "1.0"
}
```

## Limitations and future work

The project needs a persisted ATS analysis model before ATS-area advice can be
used. It also needs administration/API flows for alumni mentor opt-in and
recruiter opportunity publication; the matching schema is in place but this
feature intentionally does not add frontend management screens. Any future
embedding or LLM layer must keep the deterministic score as the decision record
and store an explicit model version.
