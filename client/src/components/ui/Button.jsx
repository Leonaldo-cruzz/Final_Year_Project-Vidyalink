import React from 'react';

const VARIANT_BASE = {
  primary: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
  ghost: 'bg-transparent hover:bg-slate-800/70 text-slate-300 hover:text-white border border-transparent hover:border-slate-700',
  outline: 'bg-transparent border border-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-blue-400',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 hover:border-red-500/50',
  success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25',
};

const SIZE_BASE = {
  xs: 'h-7 px-3 text-[11px] rounded-lg gap-1.5',
  sm: 'h-8 px-3.5 text-xs rounded-lg gap-2',
  md: 'h-10 px-5 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-150 cursor-pointer select-none
        focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-950
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_BASE[variant] || VARIANT_BASE.primary}
        ${SIZE_BASE[size] || SIZE_BASE.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin flex-shrink-0" />
      ) : LeftIcon ? (
        <LeftIcon className="w-4 h-4 flex-shrink-0" />
      ) : null}

      <span>{children}</span>

      {!loading && RightIcon && (
        <RightIcon className="w-4 h-4 flex-shrink-0" />
      )}
    </button>
  );
};

export default Button;
