import React from 'react';
import { getInitials } from '@/utils/formatters';

const SIZE_STYLES = {
  xs: 'w-6 h-6 text-[10px] rounded-md',
  sm: 'w-8 h-8 text-xs rounded-lg',
  md: 'w-10 h-10 text-sm rounded-xl',
  lg: 'w-12 h-12 text-base rounded-xl',
  xl: 'w-16 h-16 text-xl rounded-2xl',
};

const Avatar = ({ name, src, size = 'md', className = '' }) => {
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${sizeStyle} object-cover border border-slate-700 ${className}`}
      />
    );
  }

  return (
    <div
      className={`
        ${sizeStyle} flex items-center justify-center font-bold
        bg-gradient-to-br from-blue-600/30 to-blue-700/20
        border border-blue-500/25 text-blue-300
        select-none flex-shrink-0
        ${className}
      `}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
