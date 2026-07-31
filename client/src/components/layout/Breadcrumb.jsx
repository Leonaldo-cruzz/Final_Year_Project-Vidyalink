import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

// Convert path segments to readable labels
const segmentToLabel = (segment) => {
  const map = {
    dashboard: 'Dashboard',
    student: 'Student',
    faculty: 'Faculty',
    recruiter: 'Recruiter',
    alumni: 'Alumni',
    admin: 'Admin',
    profile: 'My Profile',
    projects: 'Projects',
    new: 'New Project',
    settings: 'Settings',
  };
  return map[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
};

const Breadcrumb = () => {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, idx) => ({
    label: segmentToLabel(seg),
    path: '/' + segments.slice(0, idx + 1).join('/'),
    isLast: idx === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-6">
      <Link to="/" className="hover:text-slate-300 transition-colors flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
      </Link>

      {crumbs.map(({ label, path, isLast }) => (
        <React.Fragment key={path}>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          {isLast ? (
            <span className="text-slate-200 font-semibold">{label}</span>
          ) : (
            <Link to={path} className="hover:text-slate-300 transition-colors">
              {label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
