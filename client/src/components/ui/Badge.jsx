import React from 'react';

/**
 * Reusable Badge component.
 *
 * @param {string} variant - 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'slate'
 * @param {string} size    - 'sm' | 'md'
 */
const VARIANT_STYLES = {
  blue:    'bg-blue-500/10 text-blue-400 border-blue-500/25',
  purple:  'bg-purple-500/10 text-purple-400 border-purple-500/25',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  amber:   'bg-amber-500/10 text-amber-400 border-amber-500/25',
  rose:    'bg-rose-500/10 text-rose-400 border-rose-500/25',
  slate:   'bg-slate-500/10 text-slate-400 border-slate-500/25',
  green:   'bg-green-500/10 text-green-400 border-green-500/25',
  red:     'bg-red-500/10 text-red-400 border-red-500/25',
};

const ROLE_VARIANT_MAP = {
  student:   'blue',
  faculty:   'purple',
  recruiter: 'emerald',
  alumni:    'amber',
  admin:     'rose',
};

const SIZE_STYLES = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

const Badge = ({
  children,
  variant = 'slate',
  size = 'md',
  role,
  dot = false,
  pulse = false,
  className = '',
}) => {
  const resolvedVariant = role ? (ROLE_VARIANT_MAP[role] || 'slate') : variant;
  const styles = VARIANT_STYLES[resolvedVariant] || VARIANT_STYLES.slate;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider
        ${styles} ${sizeStyle} ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: 'currentColor' }}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
