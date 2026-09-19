# VidyaLink frontend audit — Sprint 12.5

## Scope

The audit covers the mounted public, authentication, role-dashboard, project, workspace, portfolio, resume, certificate, GitHub, applicant, and fallback routes. The legacy `/pages/*/index.jsx` variants and the unmounted `ProjectsList` marketplace are not treated as the primary experience; they remain in the repository for compatibility.

## Delivered

- Replaced the generic blue/purple/glass visual language with deep ink, warm paper, graphite, and a restrained copper accent.
- Added serif display typography, sentence-case product copy, compact status treatments, and quieter borders/shadows.
- Mounted the real landing experience at `/` with evidence-led messaging and a meaningful shared-record visualization.
- Reworked public navigation and footer, including responsive mobile navigation.
- Reworked authentication pages with a shared editorial layout, explicit labels, password visibility controls, validation, loading states, and honest password-help messaging.
- Reworked the dashboard shell with role-aware navigation, profile/sign-out controls, theme control, mobile drawer open/close behavior, and responsive content offsets.
- Added a connected student `/applications` route and navigation entry for the existing application service.
- Reworked shared `Button`, card, badge, and avatar primitives so role dashboards and data pages inherit a coherent hierarchy.
- Changed role navigation to avoid links to routes that the current backend role guards cannot use.
- Removed unused imports and fixed existing lint blockers in the client and server workspaces.

## Route review

| Area | Route(s) | Review status |
| --- | --- | --- |
| Public | `/`, `/portfolio/verify/:certificateId` | Visual shell reviewed; verification data still depends on the API |
| Auth | `/login`, `/register`, `/forgot-password` | Reviewed at desktop width; validation and empty/error states present |
| Dashboards | `/dashboard/student`, `/dashboard/faculty`, `/dashboard/recruiter`, `/dashboard/alumni`, `/dashboard/admin` | Shared shell and primitives reviewed; protected data requires an authenticated session |
| Student evidence | `/profile`, `/projects`, `/resume`, `/certificates`, `/github`, `/portfolio/me`, `/applications` | Existing service-backed pages retained and visually aligned through shared primitives |
| Collaboration | `/workspaces`, `/workspace/:workspaceId`, `/projects/:projectId/applicants` | Existing service-backed pages retained; legacy workspace remains intentionally feature-stable |
| Fallback | `*` | Existing not-found route retained |

## UX and accessibility findings

Resolved: generic landing copy, root redirect, glass/gradient-heavy surfaces, unlabelled form controls, fake demo autofill, simulated password-reset success, nonfunctional mobile sidebar trigger, always-on unread notification dot, and role navigation links that led to backend-denied routes.

Remaining: the notification center now has an honest empty state but is not connected to a notification API; the password-help route explains the missing backend endpoint rather than pretending an email was sent. Several role dashboards still display fixture snapshot data from the earlier foundation and should be connected to dashboard APIs before production use. The old unmounted project marketplace remains visually older than the active project portfolio and is intentionally outside this sprint's scope.

## Responsive and visual QA

- Public landing and auth screens were manually reviewed in the in-app browser at desktop width.
- Layout rules cover 360px through 1440px+: navigation collapses, form grids stack, dashboard sidebar becomes a drawer, and content gutters reduce at small widths.
- Reduced-motion CSS is enabled globally.
- Build and lint checks are recorded below.

## Verification

- `npm run lint` — passed for client and server workspaces.
- `cd client; npm run build; cd ..` — passed. Vite reports an existing bundle-size advisory for the main chunk.
- `git diff --check` — passed with no whitespace errors.
- `npm test` — blocked: the repository root has no `test` script, so npm exits with `Missing script: "test"`. No test configuration was added or weakened during this visual-only sprint.

## Files of interest

- `client/src/index.css`
- `client/src/layouts/AuthLayout.jsx`
- `client/src/layouts/DashboardLayout.jsx`
- `client/src/components/layout/Navbar.jsx`
- `client/src/components/layout/Sidebar.jsx`
- `client/src/components/layout/Topbar.jsx`
- `client/src/components/ui/Card.jsx`
- `client/src/components/ui/Badge.jsx`
- `client/src/pages/Landing.jsx`
- `client/src/pages/Login.jsx`
- `client/src/pages/Register.jsx`
