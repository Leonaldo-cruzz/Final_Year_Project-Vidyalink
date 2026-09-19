import React from 'react';

const TONES = {
  blue: 'var(--color-accent)',
  purple: 'var(--color-accent)',
  emerald: 'var(--color-success)',
  green: 'var(--color-success)',
  amber: 'var(--color-warning)',
  rose: 'var(--color-danger)',
  red: 'var(--color-danger)',
  info: 'var(--color-accent)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
  danger: 'var(--color-danger)',
  default: '#92a0aa',
  slate: '#92a0aa',
};

const ROLE_VARIANT_MAP = { student: 'blue', faculty: 'blue', recruiter: 'blue', alumni: 'blue', admin: 'blue' };

const Badge = ({ children, variant = 'slate', size = 'md', role, dot = false, pulse = false, className = '' }) => {
  const resolvedVariant = role ? ROLE_VARIANT_MAP[role] || 'slate' : variant;
  return (
    <span
      className={`status-badge status-badge-${size} inline-flex items-center gap-1.5 rounded-md border font-bold uppercase tracking-[0.12em] ${className}`}
      style={{ '--badge-tone': TONES[resolvedVariant] || TONES.slate }}
    >
      {dot && <span className={`status-dot flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`} />}
      {children}
    </span>
  );
};

export default Badge;
