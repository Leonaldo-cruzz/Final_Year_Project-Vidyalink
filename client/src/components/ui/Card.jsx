import React from 'react';

/** Stat card — used in all role dashboards */
export const StatCard = ({ label, value, icon: Icon, trend, trendLabel, color = 'blue', className = '' }) => {
  const colorMap = {
    blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',    icon: 'bg-blue-600/15' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: 'bg-emerald-600/15' },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   icon: 'bg-amber-600/15' },
    purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20',  icon: 'bg-purple-600/15' },
    rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20',    icon: 'bg-rose-600/15' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`
      relative rounded-2xl border bg-slate-900/60 p-5
      card-hover overflow-hidden
      ${c.border} ${className}
    `}>
      {/* Subtle bg glow */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-30 -mr-4 -mt-4 ${c.bg}`} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
          <p className={`text-3xl font-extrabold ${c.text} leading-none`}>{value}</p>
          {trendLabel && (
            <p className={`text-xs font-medium mt-2 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon} border ${c.border}`}>
            <Icon className={`w-5 h-5 ${c.text}`} />
          </div>
        )}
      </div>
    </div>
  );
};

/** Section card — glass panel with title and optional action */
export const SectionCard = ({ title, subtitle, action, children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-800/70 bg-slate-900/60 overflow-hidden ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
        <div>
          {title && <h3 className="text-sm font-bold text-white">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

/** Quick action card — clickable tile */
export const ActionCard = ({ label, desc, icon: Icon, onClick, color = 'blue', className = '' }) => {
  const colorMap = {
    blue:    'hover:border-blue-500/40 hover:bg-blue-600/5 text-blue-400',
    emerald: 'hover:border-emerald-500/40 hover:bg-emerald-600/5 text-emerald-400',
    purple:  'hover:border-purple-500/40 hover:bg-purple-600/5 text-purple-400',
    amber:   'hover:border-amber-500/40 hover:bg-amber-600/5 text-amber-400',
    rose:    'hover:border-rose-500/40 hover:bg-rose-600/5 text-rose-400',
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-2xl border border-slate-800/70
        bg-slate-900/40 transition-all duration-150 group
        ${colorMap[color] || colorMap.blue}
        ${className}
      `}
    >
      {Icon && (
        <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-150">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <p className="text-sm font-bold text-slate-100">{label}</p>
      {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
    </button>
  );
};

/** Generic glass card */
const Card = ({ children, className = '', ...props }) => (
  <div
    className={`rounded-2xl border border-slate-800/70 bg-slate-900/60 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;
