import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible modal with backdrop click-to-close and ESC key support.
 *
 * @param {boolean}  open       - Whether the modal is visible
 * @param {function} onClose    - Called when user closes the modal
 * @param {string}   title      - Modal heading
 * @param {string}   size       - 'sm' | 'md' | 'lg' | 'xl'
 * @param {node}     children   - Modal body content
 * @param {node}     footer     - Optional footer content
 */
const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const Modal = ({ open, onClose, title, size = 'md', children, footer }) => {
  const overlayRef = useRef(null);
  const titleId = useId();

  // ESC key to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className={`
        w-full ${SIZE_MAP[size] || SIZE_MAP.md}
        bg-slate-900 border border-slate-800 rounded-lg shadow-lg
        fade-in-up overflow-hidden
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 id={titleId} className="text-base font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
