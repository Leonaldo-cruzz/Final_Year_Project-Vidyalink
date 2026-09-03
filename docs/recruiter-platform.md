# Recruiter platform

The recruiter workspace follows this workflow:

`Recruiter profile → Candidate search → Candidate details → Public verified evidence → AI summary → Shortlist → Interview → Interview status`

All recruiter routes require an authenticated `recruiter` or `admin` user. Responses use the server’s normal `{ success, data }` envelope.

## API surface

| Capability | Endpoint |
| --- | --- |
| Recruiter profile | `GET/POST/PATCH /api/v1/recruiter/profile` |
| Candidate search | `GET /api/v1/recruiter/candidates` |
| Candidate details | `GET /api/v1/recruiter/candidates/:studentId` |
| Candidate AI summary | `GET /api/v1/recruiter/candidates/:studentId/ai-summary` |
| Candidate comparison | `GET /api/v1/recruiter/candidates/compare?ids=id1,id2` |
| Shortlists | `GET/POST /api/v1/recruiter/shortlists`, `DELETE /api/v1/recruiter/shortlists/:studentId` |
| Interviews | `GET/POST /api/v1/recruiter/interviews` |
| Interview actions | `PATCH /api/v1/recruiter/interviews/:id/reschedule`, `/cancel`, `/complete` |

Candidate search accepts name/keyword (`search`), comma-separated `skills` and `requiredSkills`, `college`, `branch`, `domain`, `graduationYear`, `verificationStatus`, `verifiedOnly`, AI score bounds for industry readiness, portfolio, and ATS, and the supported sort keys `industryReadiness`, `portfolioScore`, `atsScore`, `updatedAt`, and `name`. Results are paginated and absent scores remain distinguishable from a score of zero.

## Visibility and safety

Workspace portfolios are verified credentials, but recruiter AI evidence is private by default. A student must explicitly opt a portfolio into recruiter/public AI visibility through `PATCH /api/v1/portfolios/:portfolioId/visibility` with `{ "isPublic": true }`. Candidate details return only public verified portfolio records and verified projects/certificates. Resume links are returned only when a public verified portfolio grants the recruiter-facing visibility context.

The recruiter AI projection contains backend evaluation values, freshness metadata, verified skills, GitHub activity summary, strengths, gaps, and recommendations. The React client does not calculate or substitute scores when a result is absent.

## Frontend routes

- `/recruiter` and `/dashboard/recruiter` — recruiter dashboard
- `/recruiter/candidates` — search and filter directory
- `/recruiter/candidates/:studentId` — verified candidate details and AI summary
- `/recruiter/candidates/compare?ids=id1,id2` — side-by-side comparison for two to five candidates
- `/recruiter/shortlists` — active shortlist management
- `/recruiter/interviews` — interview lifecycle management
- `/recruiter/profile` — recruiter/company profile
