'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export default function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${SIZE_CLASS[size]} rounded-lg bg-white shadow-2xl`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-brand-gray-200 px-5 py-4">
            <h2 className="text-lg font-bold text-brand-black">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-brand-gray-500 hover:bg-brand-gray-100"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        )}
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-brand-gray-200 bg-brand-gray-50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
