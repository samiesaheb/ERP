'use client';

import { useEffect } from 'react';

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function SlideOver({ open, onClose, title, children }: SlideOverProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 shadow-xl flex flex-col h-full border-l-[0.5px] border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between px-5 py-4 border-b-[0.5px] border-neutral-200 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
