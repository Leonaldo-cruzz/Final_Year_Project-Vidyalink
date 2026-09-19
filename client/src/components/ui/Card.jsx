import React from 'react';

const TONE_COLORS = {
  blue: 'var(--color-accent)',
  purple: 'var(--color-accent)',
  emerald: 'var(--color-success)',
  amber: 'var(--color-warning)',
  rose: 'var(--color-danger)',
};

/** A compact dashboard metric with one restrained accent line. */
export const StatCard = ({ label, value, icon: Icon, trend, trendLabel, color = 'blue', className = '' }) => (
  <div
    className={`stat-card rounded-lg border border-slate-800/80 bg-slate-900/65 p-5 card-hover ${className}`}
    style={{ '--stat-tone': TONE_COLORS[color] || TONE_COLORS.blue }}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-extrabold leading-none text-slate-100">{value}</p>
        {trendLabel && (
          <p className={`mt-2 text-xs font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel}
          </p>
        )}
      </div>
      {Icon && <div className="stat-card-icon flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-slate-700/80"><Icon className="h-4 w-4" /></div>}
    </div>
  </div>
);

/** Section card — bordered panel with a quiet header hierarchy. */
export const SectionCard = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`section-card overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/65 ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 px-5 py-4 sm:px-6">
        <div>
          {title && <h3 className="text-sm font-bold text-slate-100">{title}</h3>}
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-5 sm:p-6">{children}</div>
  </section>
);

/** Quick action card — clickable tile with a clear interaction affordance. */
export const ActionCard = ({ label, desc, icon: Icon, onClick, color = 'blue', className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`action-card w-full rounded-lg border border-slate-800/80 bg-slate-950/45 p-4 text-left transition-all duration-150 group ${className}`}
    style={{ '--action-tone': TONE_COLORS[color] || TONE_COLORS.blue }}
  >
    {Icon && <div className="action-card-icon mb-3 flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/80"><Icon className="h-4 w-4" /></div>}
    <p className="text-sm font-bold text-slate-100">{label}</p>
    {desc && <p className="mt-1 text-xs text-slate-500">{desc}</p>}
  </button>
);

const Card = ({ children, className = '', ...props }) => (
  <div className={`rounded-lg border border-slate-800/80 bg-slate-900/65 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
