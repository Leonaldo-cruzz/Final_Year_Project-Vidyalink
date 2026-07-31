import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable Input component with label, helper text, error state, and icon support.
 */
const Input = forwardRef(({
  label,
  id,
  error,
  helperText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  rightAction,
  className = '',
  required,
  ...props
}, ref) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={id}
          className={`
            form-input
            ${LeftIcon ? 'pl-10' : ''}
            ${RightIcon || rightAction ? 'pr-11' : ''}
            ${error ? 'error' : ''}
          `}
          {...props}
        />

        {(RightIcon || rightAction) && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightAction || (RightIcon && <RightIcon className="w-4 h-4 text-slate-500" />)}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
