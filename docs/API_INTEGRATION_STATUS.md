# API integration status — Sprint 12 audit

Audit date: 2026-09-03. This document records the implementation that is actually mounted by `server/src/app.js` and routed by `client/src/routes/AppRoutes.jsx`; it does not treat dashboard copy or unused components as a completed module.

| Area | Frontend / API integration | Authentication and validation | Status |
| --- | --- | --- | --- |
| Authentication | Login, register, logout, refresh, current user; `/api/v1/auth/*` | Public validation for login/register; JWT authentication for logout/me | PASS |
| Profile | `/profile` UI and `/api/v1/profile` | Authenticated; create/update Zod validation | PASS |
| Student projects | Project UI and `/api/v1/projects` | Student-only, ownership-scoped service, multipart validation | PASS |
| Certificates | Certificate UI and `/api/v1/certificates` | Student-only; create/update validation added in Sprint 12 | PASS |
| Resume upload | `/resume` UI and `/api/v1/resume` | Student-only; strict PDF MIME/extension validation | PASS |
| GitHub profile | `/github` UI and `/api/v1/github` | Student-only; username validation, timeout/rate-limit handling | PASS (external GitHub availability required) |
| Verified portfolio certificate | `/portfolio/verify/:certificateId`, `/api/v1/portfolios` | Public verification by opaque certificate ID; own portfolio endpoint authenticated | PASS (legacy workspace/milestone path) — generated only after the existing workspace reaches 100% verified milestones |
| Applications | Student/recruiter components and `/api/v1/applications` | Role middleware and request schemas present | PARTIAL — student submit/list is covered; recruiter management is blocked by the project-schema mismatch described below |
| Faculty verification | Faculty dashboard only | No verification controller, service, model, API, or actionable UI | BLOCKED |
| AI evaluation / ATS analysis | Informational UI copy only | No AI route or persisted result model; `ai-service` is a skeleton | BLOCKED |
| Alumni interactions | Dashboard mock data only | No API/model for mentorship, endorsement, or referral | BLOCKED |
| Recruiter candidate search | Dashboard mock data only | No candidate search/filter API or verification-aware visibility model | BLOCKED |
| Notifications | Bell icon only | No notification model, route, or delivery service | BLOCKED |
| Admin analytics | Dashboard mock data only | No admin analytics API; no database-backed metrics | BLOCKED |

## Route and RBAC findings

- Frontend student-only profile-content pages now use the `student` route guard, matching the resume and certificate APIs. The previous admin allowance led to frontend pages that could only receive backend `403` responses.
- Certificate create/update requests now run their existing Zod schemas after multipart parsing. Invalid multipart bodies are rejected before they reach the service.
- Login responses now expose only the access token. The refresh token remains in the HTTP-only cookie as the client contract already states.
- All mounted API controllers use `ApiResponse`, `asyncHandler`, and the central error middleware. The standard error status mapping is 400/401/403/404/409/429/500.

## Existing-but-out-of-scope modules

`workspaces`, `milestones`, and `engagements` are mounted in the existing codebase. Sprint 12 did not expand or redesign those modules because the sprint explicitly excludes project marketplace/execution workflow work.

## Testability boundary

The repository now has a Node-native HTTP/Mongoose integration harness. Full API workflow cases require either an explicit disposable `MONGODB_URI_TEST` or a locally installed `mongod`; the harness never uses the application `MONGODB_URI` and skips safely when neither option is available.

## Automated integration coverage

`server/src/tests/integration-api.test.js` starts the API in-process and uses real HTTP requests and Mongoose persistence. It uses `MONGODB_URI_TEST` when explicitly provided; otherwise, when a local `mongod` executable is available, it starts a temporary database directory on a random localhost port. It never falls back to `MONGODB_URI` from the application environment. If neither test database option is available, the integration cases are skipped with an explicit reason.

The 2026-09-03 validation run reported **23 tests: 15 passed, 0 failed, 8 skipped**. The passing integration cases cover registration/login and RBAC, profile/project/certificate ownership, resume upload/replacement/validation, student application submission/listing, the existing workspace milestone verification path, public verified-portfolio retrieval, and a supported critical path. The eight skipped cases correspond to the unimplemented faculty verification, AI, ATS, recruiter discovery/shortlist, recruiter-managed application status, notification, alumni, and admin analytics modules listed above.
