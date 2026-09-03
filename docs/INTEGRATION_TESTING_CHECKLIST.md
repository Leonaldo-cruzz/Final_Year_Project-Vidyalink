# Integration testing checklist — Sprint 12

Use a non-production MongoDB database and test accounts. Record each outcome below as **PASS**, **FAIL**, or **BLOCKED** with evidence; never insert production credentials into this repository.

## Environment and startup

| Check | Status | Evidence / action |
| --- | --- | --- |
| Copy `.env.example` to an untracked `.env` and set MongoDB/JWT values | BLOCKED | Manual development-server configuration remains operator-specific; the automated suite uses an isolated local MongoDB or explicit `MONGODB_URI_TEST`. |
| Start API: `npm run dev:server` | BLOCKED | Requires configured MongoDB/JWT values |
| Start client: `npm run dev:client` | PASS | Production client build succeeds |
| Confirm `GET /api/v1/health` | BLOCKED | `npm run test:api` on 2026-09-03 received `ECONNREFUSED` from `http://localhost:5000/api/v1`; start a configured API first. |
| Confirm test database is isolated and disposable | PASS | `integration-api.test.js` starts a temporary local `mongod` database on 2026-09-03. An explicit `MONGODB_URI_TEST` is supported; `MONGODB_URI` is never used by the suite. |

## Supported workflow checks

| Workflow | Status | Manual acceptance steps |
| --- | --- | --- |
| Student register/login/logout/session refresh | PASS (integration) | Registration, valid/invalid login, protected access, and wrong-role behavior run against the isolated API/database. |
| Student profile | PASS (integration) | Create/update/retrieve profile and verify the persisted user reference. |
| Student projects | PASS (integration) | Create/update project and verify another student receives 404 for read/update. |
| Student certificates | PASS (integration) | Upload/update/retrieve a certificate and verify ownership plus Pending status. |
| Resume upload | PASS (integration) | Upload/replace/retrieve a PDF and reject a non-PDF payload while preserving the existing record. |
| GitHub | BLOCKED | Connect a real public account, sync, disconnect; test an invalid name and rate-limited response. Requires network/API. |
| Public portfolio certificate | PASS (integration, legacy path) | The suite seeds the existing workspace record because no workspace-creation route is mounted, then uses milestone submission/verification and verifies the public certificate endpoint. This is not the requested faculty queue. |
| Student application submit/list | PASS (integration) | Student submits to an existing project, sees the `Applied` record, and duplicate submission is rejected. |

## Not implemented in this repository

| Workflow | Status | Reason |
| --- | --- | --- |
| Faculty verification transitions | BLOCKED | No backend/frontend module exists. |
| AI portfolio/ATS evaluation | BLOCKED | No mounted evaluator or ATS analyzer exists. |
| Alumni mentorship, endorsements, referrals | BLOCKED | No persisted module exists. |
| Recruiter candidate discovery/verified filtering | BLOCKED | No candidate-search or visibility API exists. |
| Notification delivery/read state | BLOCKED | No notification model or API exists. |
| Database-backed admin analytics | BLOCKED | Admin dashboard is hardcoded. |

## Security and error checks

| Check | Status | Expected result |
| --- | --- | --- |
| Unauthenticated API request | PASS (contract) | 401 from auth/role middleware. |
| Wrong role API request | PASS (contract) | 403 from role middleware. |
| Weak registration password / public admin registration | PASS (contract) | 400 validation failure. |
| Invalid certificate metadata after upload | PASS (implementation) | 400 and uploaded temporary file is removed. |
| Invalid resume MIME/extension pairing | PASS (implementation) | 400. |
| Missing/invalid resource ID | PASS (integration coverage) | Ownership-scoped project/certificate IDs return 404 to another authenticated student. |
| Upload privacy | FAIL | `/uploads` is publicly static; tracked as HIGH in `KNOWN_ISSUES.md`. |

## Final commands and acceptance

Run from repository root:

```powershell
npm test
npm run lint
cd client
npm run build
cd ..
```

Current automated result: **15 passed, 0 failed, 8 skipped (23 total)**. Lint and the frontend production build also pass. Full system acceptance remains **BLOCKED** by the CRITICAL/HIGH missing modules listed in `KNOWN_ISSUES.md`.

The automated suite is split between `server/src/tests/integration-contract.test.js` (4 contract tests) and `server/src/tests/integration-api.test.js` (11 passing integration tests plus 8 explicit skips for unsupported modules).

The existing `npm run test:api` script was also executed. It correctly stopped at the health check because no local API process was listening; this is an environment block, not a passing integration run.
