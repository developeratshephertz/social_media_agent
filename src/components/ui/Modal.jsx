import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onOpenChange, title, children, ariaLabel }) {
  const root = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
  const ref = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onOpenChange && onOpenChange(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open && ref.current) {
      const prev = document.activeElement;
      ref.current.focus();
      return () => prev && (prev).focus();
    }
  }, [open]);

  if (!open) return null;
  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange && onOpenChange(false)} />
      <div role="dialog" aria-modal="true" aria-label={ariaLabel || title} tabIndex={-1} ref={ref} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-6 z-10 max-w-2xl mx-4 focus:outline-none">
        {title && <div className="text-lg font-semibold mb-2">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );

  return root ? createPortal(modal, root) : modal;
}
