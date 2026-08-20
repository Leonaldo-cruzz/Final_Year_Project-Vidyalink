// ============================================================
// VIDYALINK — App Constants
// ============================================================

// ── Roles ────────────────────────────────────────────────────
export const ROLES = {
  STUDENT:   'student',
  FACULTY:   'faculty',
  RECRUITER: 'recruiter',
  ALUMNI:    'alumni',
  ADMIN:     'admin',
};

export const ROLE_LABELS = {
  [ROLES.STUDENT]:   'Student',
  [ROLES.FACULTY]:   'Faculty',
  [ROLES.RECRUITER]: 'Recruiter',
  [ROLES.ALUMNI]:    'Alumni',
  [ROLES.ADMIN]:     'Admin',
};

export const ROLE_COLORS = {
  [ROLES.STUDENT]:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/25' },
  [ROLES.FACULTY]:   { bg: 'bg-purple-500/10',  text: 'text-purple-400', border: 'border-purple-500/25' },
  [ROLES.RECRUITER]: { bg: 'bg-emerald-500/10', text: 'text-emerald-400',border: 'border-emerald-500/25' },
  [ROLES.ALUMNI]:    { bg: 'bg-amber-500/10',   text: 'text-amber-400',  border: 'border-amber-500/25' },
  [ROLES.ADMIN]:     { bg: 'bg-rose-500/10',    text: 'text-rose-400',   border: 'border-rose-500/25' },
};

// ── Routes ───────────────────────────────────────────────────
export const ROUTES = {
  HOME:      '/',
  LOGIN:     '/login',
  REGISTER:  '/register',
  FORGOT:    '/forgot-password',

  // Role dashboards
  STUDENT_DASHBOARD:   '/dashboard/student',
  FACULTY_DASHBOARD:   '/dashboard/faculty',
  RECRUITER_DASHBOARD: '/dashboard/recruiter',
  ALUMNI_DASHBOARD:    '/dashboard/alumni',
  ADMIN_DASHBOARD:     '/admin',
  ADMIN_USERS:         '/admin/users',
  ADMIN_ANALYTICS:     '/admin/analytics',

  // Shared
  PROFILE:   '/profile',
  PROJECTS:  '/projects',
  PROJECT_DETAIL: '/projects/:id',
  CREATE_PROJECT: '/projects/new',
  WORKSPACES: '/workspaces',
  WORKSPACE_DETAIL: '/workspace/:workspaceId',
  PORTFOLIO: '/portfolio/me',
  RESUME: '/resume',
  CERTIFICATES: '/certificates',
  GITHUB: '/github',
  VERIFY_PORTFOLIO: '/portfolio/verify/:certificateId',

  // Fallback
  NOT_FOUND: '*',
};

/** Maps a user's role to their dashboard route */
export const ROLE_ROUTE_MAP = {
  [ROLES.STUDENT]:   ROUTES.STUDENT_DASHBOARD,
  [ROLES.FACULTY]:   ROUTES.FACULTY_DASHBOARD,
  [ROLES.RECRUITER]: ROUTES.RECRUITER_DASHBOARD,
  [ROLES.ALUMNI]:    ROUTES.ALUMNI_DASHBOARD,
  [ROLES.ADMIN]:     ROUTES.ADMIN_DASHBOARD,
};

// ── API Endpoints ────────────────────────────────────────────
export const API = {
  // Auth
  LOGIN:         '/auth/login',
  REGISTER:      '/auth/register',
  LOGOUT:        '/auth/logout',
  ME:            '/auth/me',
  REFRESH_TOKEN: '/auth/refresh-token',

  // Profile
  PROFILE:       '/profile',
  PROFILE_ME:    '/profile/me',

  // Projects
  PROJECTS:      '/projects',
  PROJECT:       (id) => `/projects/${id}`,
};

// ── Sidebar Nav (role-specific) ───────────────────────────────
export const NAV_ITEMS = {
  [ROLES.STUDENT]: [
    { label: 'Dashboard',    icon: 'LayoutDashboard', path: ROUTES.STUDENT_DASHBOARD },
    { label: 'Projects',     icon: 'FolderKanban',    path: ROUTES.PROJECTS },
    { label: 'Workspaces',   icon: 'Briefcase',       path: ROUTES.WORKSPACES },
    { label: 'Certificates', icon: 'Award',           path: ROUTES.CERTIFICATES },
    { label: 'GitHub',       icon: 'Code2',           path: ROUTES.GITHUB },
    { label: 'Portfolio',    icon: 'Award',           path: ROUTES.PORTFOLIO },
    { label: 'Resume',       icon: 'FileText',        path: ROUTES.RESUME },
    { label: 'My Profile',   icon: 'UserCircle',      path: ROUTES.PROFILE },
  ],
  [ROLES.FACULTY]: [
    { label: 'Dashboard',       icon: 'LayoutDashboard', path: ROUTES.FACULTY_DASHBOARD },
    { label: 'Projects',        icon: 'FolderKanban',    path: ROUTES.PROJECTS },
    { label: 'Workspaces',      icon: 'Briefcase',       path: ROUTES.WORKSPACES },
    { label: 'Post Project',    icon: 'PlusSquare',      path: ROUTES.CREATE_PROJECT },
    { label: 'My Profile',      icon: 'UserCircle',      path: ROUTES.PROFILE },
  ],
  [ROLES.RECRUITER]: [
    { label: 'Dashboard',       icon: 'LayoutDashboard', path: ROUTES.RECRUITER_DASHBOARD },
    { label: 'Projects',        icon: 'FolderKanban',    path: ROUTES.PROJECTS },
    { label: 'Workspaces',      icon: 'Briefcase',       path: ROUTES.WORKSPACES },
    { label: 'My Profile',      icon: 'UserCircle',      path: ROUTES.PROFILE },
  ],
  [ROLES.ALUMNI]: [
    { label: 'Dashboard',       icon: 'LayoutDashboard', path: ROUTES.ALUMNI_DASHBOARD },
    { label: 'Projects',        icon: 'FolderKanban',    path: ROUTES.PROJECTS },
    { label: 'Workspaces',      icon: 'Briefcase',       path: ROUTES.WORKSPACES },
    { label: 'My Profile',      icon: 'UserCircle',      path: ROUTES.PROFILE },
  ],
  [ROLES.ADMIN]: [
    { label: 'Dashboard',       icon: 'LayoutDashboard', path: ROUTES.ADMIN_DASHBOARD },
    { label: 'Users',           icon: 'Users',           path: ROUTES.ADMIN_USERS },
    { label: 'Analytics',       icon: 'Activity',        path: ROUTES.ADMIN_ANALYTICS },
    { label: 'Projects',        icon: 'FolderKanban',    path: ROUTES.PROJECTS },
    { label: 'Workspaces',      icon: 'Briefcase',       path: ROUTES.WORKSPACES },
    { label: 'My Profile',      icon: 'UserCircle',      path: ROUTES.PROFILE },
  ],
};

// ── Theme ────────────────────────────────────────────────────
export const THEME = {
  DARK:  'dark',
  LIGHT: 'light',
};

export const THEME_KEY = 'vl_theme';

// ── Password Rules ───────────────────────────────────────────
export const PASSWORD_RULES = [
  { key: 'minLen',     label: 'Min 8 characters',   test: (v) => v.length >= 8 },
  { key: 'hasUpper',   label: 'Uppercase letter',    test: (v) => /[A-Z]/.test(v) },
  { key: 'hasLower',   label: 'Lowercase letter',    test: (v) => /[a-z]/.test(v) },
  { key: 'hasNumber',  label: 'Number',              test: (v) => /[0-9]/.test(v) },
  { key: 'hasSpecial', label: 'Special character',   test: (v) => /[!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?`~]/.test(v) },
];

// ── Register Roles (shown on register page) ──────────────────
export const REGISTER_ROLES = [
  { id: ROLES.STUDENT,   label: 'Student',   desc: 'Enrolled learner or candidate',   icon: '🎓' },
  { id: ROLES.FACULTY,   label: 'Faculty',   desc: 'Professor or research guide',     icon: '🏫' },
  { id: ROLES.ALUMNI,    label: 'Alumni',    desc: 'Graduate & industry mentor',      icon: '🌟' },
  { id: ROLES.RECRUITER, label: 'Recruiter', desc: 'Talent acquisition partner',      icon: '💼' },
];
