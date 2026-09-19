import React from 'react';
import { getInitials } from '@/utils/formatters';

const SIZE_STYLES = {
  xs: 'h-6 w-6 rounded-md text-[10px]',
  sm: 'h-8 w-8 rounded-md text-xs',
  md: 'h-10 w-10 rounded-md text-sm',
  lg: 'h-12 w-12 rounded-lg text-base',
  xl: 'h-16 w-16 rounded-lg text-xl',
};

const Avatar = ({ name, src, size = 'md', className = '' }) => {
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;
  if (src) return <img src={src} alt={name || 'Avatar'} className={`${sizeStyle} flex-shrink-0 border border-slate-700 object-cover ${className}`} />;

  return (
    <div className={`${sizeStyle} flex flex-shrink-0 select-none items-center justify-center border border-orange-300/30 bg-orange-300/10 font-bold text-orange-200 ${className}`} aria-label={name}>
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
