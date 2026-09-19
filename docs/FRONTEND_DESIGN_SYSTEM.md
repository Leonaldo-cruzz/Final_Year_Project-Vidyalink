# VidyaLink frontend design system

Sprint 12.5 establishes an editorial, evidence-led visual language for the active VidyaLink application. The system is intentionally quieter than a typical SaaS dashboard: deep ink creates trust, warm paper creates reading room, and copper gives the product one recognizable voice.

## Foundations

### Color roles

| Role | Token | Use |
| --- | --- | --- |
| Deep ink | `--color-ink` | Public hero, navigation, application shell |
| Ink soft | `--color-ink-soft` | Dashboard surfaces and product panels |
| Warm paper | `--color-paper` | Public content and light theme background |
| Paper bright | `--color-paper-bright` | Forms, cards, and reading surfaces |
| Copper | `--color-accent` | Primary action, active navigation, emphasis |
| Success | `--color-success` | Verified, selected, operational |
| Warning | `--color-warning` | Pending and attention states |
| Danger | `--color-danger` | Errors, rejected, destructive actions |

Copper is the only brand accent. Green, amber, and red communicate meaning; they are not decorative role colors.

### Type

- `DM Serif Display` (with Georgia fallback) is used for public hero titles and major editorial headings.
- `Manrope` (with system fallback) is used for controls, navigation, labels, and body copy.
- `.eyebrow` is reserved for short section labels and uses wide tracking.
- Titles use sentence case and explain the user's task or the product's purpose.

### Shape and depth

- Default control radius: `10px` (`--radius-md`)
- Panel radius: `14px` (`--radius-lg`)
- Borders carry more hierarchy than shadows.
- Shadows are short and quiet (`--shadow-sm` / `--shadow-md`); no glow or glass effects are part of the active system.
- Status badges are compact rectangles with a dot when a live state needs to be scanned.

## Layout rules

- Public pages use a centered `max-w-7xl` reading width with large horizontal gutters.
- Dashboard content uses a fixed role-aware sidebar and a sticky top bar; the content offset collapses to zero below `1024px`.
- Grid layouts should collapse from four columns to two and then one column without hiding core information.
- Forms remain readable at 360px: labels stay visible, controls use full width, and optional details are grouped below required identity fields.

## Shared primitives

- `AuthLayout`: split editorial context and paper form surface for sign-in, registration, and password help.
- `DashboardLayout`: responsive shell with mobile drawer, top-bar menu trigger, breadcrumb, theme switch, profile access, and sign-out.
- `Button`: primary copper action plus secondary, outline, ghost, danger, and success variants.
- `Card`, `SectionCard`, `StatCard`, `ActionCard`: consistent bordered surfaces for dashboards and data-heavy pages.
- `Badge`: semantic state and role labels without using a rainbow of brand accents.
- `Avatar`: neutral/copper initials fallback with accessible alternative text.

## Interaction and accessibility

- All icon-only controls have an accessible label.
- Form controls have explicit labels, autocomplete hints, validation messages, and submit/loading states.
- Role selectors expose `aria-pressed`; navigation exposes landmarks and closes after mobile selection.
- `:focus-visible` uses a copper outline with a visible offset.
- Reduced-motion users receive near-zero animation duration through the global media query.
- Error and session messages use `role="alert"` where they change the user's next action.

## Content principles

- Prefer “Build evidence of what you can actually do” to generic platform language.
- Describe only connected workflows. Unsupported features should be clearly unavailable rather than simulated.
- Use role labels to explain responsibility: students build, faculty verify, recruiters discover context, alumni guide.
