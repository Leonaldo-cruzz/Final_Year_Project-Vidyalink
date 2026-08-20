# Admin and platform analytics

All endpoints in this module require an authenticated account with the `admin` role. The existing JWT middleware loads the role from MongoDB for every request, then the existing RBAC middleware returns `403` for students, faculty, recruiters, and alumni.

## Frontend routes

| Route | Purpose |
| --- | --- |
| `/admin` | Live platform overview and health indicators |
| `/admin/users` | User search, filters, pagination, status changes, and role changes |
| `/admin/analytics` | Date-filtered charts for user, verification, project, recruitment, and activity data |
| `/dashboard/admin` | Backward-compatible redirect to `/admin` |

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/admin/analytics/overview` | Overview card counts, current system state, and metric availability |
| `GET` | `/api/v1/admin/analytics/verifications?from&to` | Verification states by tracked type plus submission activity |
| `GET` | `/api/v1/admin/analytics/projects?from&to` | Project state totals, category/domain groups, and project creation activity |
| `GET` | `/api/v1/admin/analytics/recruitment` | Shortlists, interview records, and current recruiter-managed application states |
| `GET` | `/api/v1/admin/analytics/activity?from&to` | Registrations, alumni registrations, profile updates, submissions, shortlists, and interviews |
| `GET` | `/api/v1/admin/users` | Paginated user list |
| `GET` | `/api/v1/admin/users/:id` | A public-safe user detail view |
| `PATCH` | `/api/v1/admin/users/:id/status` | Set `active`, `inactive`, or `blocked` |
| `PATCH` | `/api/v1/admin/users/:id/role` | Set a permitted persisted role |

User-list query parameters are `page`, `limit` (1–100), `search`, `role`, `status`, `sortBy`, and `sortOrder`. Search is escaped and prefix-matched against `fullName` and `email`; sort fields are allow-listed. User responses project only public profile/account fields and never include passwords or refresh tokens.

`from` and `to` are ISO dates. Analytics defaults to the most recent 30 calendar days when the range is omitted.

## Aggregation and data semantics

The analytics service uses MongoDB `$group`, `$facet`, `$unionWith`, and date grouping pipelines. It never loads every source document into Node to calculate dashboard figures. Date charts only bring back grouped daily totals.

- Verified students are distinct users with a verified project or certificate.
- Pending and rejected verification totals combine persisted project and certificate verification states.
- `changesRequested` comes from persisted deliverables with `changes_requested` status.
- Total interviews are applications that persist an `interviewDate`; scheduled interviews are applications currently in `Interview Scheduled`.
- Recruiter activity is a count of applications currently in a recruiter-managed state (`Under Review`, `Shortlisted`, `Interview Scheduled`, `Selected`, or `Rejected`).
- Profile updates are based on persisted profile `updatedAt` timestamps. The schema stores current timestamps, not a historical event log.

The current schema does not persist referrals, completed/cancelled interview states, profile/resume/GitHub verification decisions, or mentorship requests. Those metrics return `null` or are marked unavailable in the response/UI instead of being fabricated. Alumni registration activity is reported from real `User` records with `role: alumni`.

## Safety and performance

- A logged-in administrator cannot alter their own role or status through this module.
- Demoting, deactivating, or blocking the last active administrator is rejected.
- Administrative role/status changes are recorded through the existing application logger.
- New indexes support common role/status, date, verification status, interview-date, and analytics queries. Pagination and field projections avoid excessive user-list reads.

## Tests

Run the database-independent admin module tests with `npm test --workspace=server`. They cover validator constraints, safe user-list construction and pagination, the last-active-admin safeguard, RBAC denial, and aggregation-backed overview mapping. The production API is additionally covered by the existing script-based API test workflow when a configured MongoDB instance is available.
