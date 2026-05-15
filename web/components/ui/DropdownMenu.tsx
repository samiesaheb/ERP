'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface MenuItem {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface DropdownMenuProps {
  items: MenuItem[];
  /** Extra classes on the trigger button */
  triggerClassName?: string;
  /** Which side the popup opens toward (default: right) */
  align?: 'left' | 'right';
}

function ThreeDotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5"  r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

export default function DropdownMenu({ items, triggerClassName = '', align = 'right' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setRect(r);
    setOpen(true);
  }

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!open) return;
    function reposition() {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    }
    function onOutside(e: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const dropdown =
    open && rect
      ? createPortal(
          <div
            style={{
              position: 'fixed',
              top: rect.bottom + 4,
              ...(align === 'left'
                ? { left: rect.left }
                : { left: rect.right - 160 }),
              width: 160,
              zIndex: 9999,
            }}
            className="bg-white border-[0.5px] border-neutral-200 rounded-lg shadow-lg py-1 overflow-hidden"
          >
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  item.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openMenu(); }}
        className={`flex items-center justify-center w-6 h-6 rounded-md text-neutral-400
                    hover:text-neutral-600 hover:bg-neutral-100 transition-colors ${triggerClassName}`}
        aria-label="Options"
      >
        <ThreeDotsIcon />
      </button>
      {dropdown}
    </>
  );
}
