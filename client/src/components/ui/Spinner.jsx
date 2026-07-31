import React from 'react';

/** Full-screen loading overlay */
export const FullPageSpinner = ({ message = 'Loading…' }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
    <p className="text-sm text-slate-400 font-medium animate-pulse">{message}</p>
  </div>
);

/** Inline spinner */
const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-10 h-10 border-4' };
  return (
    <span
      className={`inline-block rounded-full border-blue-500/20 border-t-blue-500 animate-spin ${sizes[size] || sizes.md} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

export default Spinner;
