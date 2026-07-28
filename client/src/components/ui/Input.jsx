import React, { forwardRef } from 'react';

const Input = forwardRef(
  ({ label, error, type = 'text', className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`w-full bg-slate-950 border ${
            error ? 'border-red-500/50' : 'border-slate-800'
          } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
