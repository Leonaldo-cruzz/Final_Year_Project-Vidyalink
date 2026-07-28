import React from 'react';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  ...props
}) => {
  const baseStyle =
    'w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2';

  const variants = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20',
    secondary:
      'bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-slate-800',
    outline:
      'border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10',
    ghost:
      'text-slate-400 hover:text-white hover:bg-slate-900',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
