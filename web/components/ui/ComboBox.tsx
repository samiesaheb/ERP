'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ComboOption {
  value: string;
  label: string;
}

interface ComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  /** Allow typing a value not in the list (stores typed text as value) */
  freeform?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function ComboBox({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  freeform = false,
  required = false,
  disabled = false,
  className = '',
}: ComboBoxProps) {
  const labelOf = (v: string) =>
    options.find((o) => o.value === v)?.label ?? (freeform ? v : '');

  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const [rect,  setRect]  = useState<DOMRect | null>(null);
  const inputRef           = useRef<HTMLInputElement>(null);
  const listRef            = useRef<HTMLUListElement>(null);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const displayValue = open ? query : labelOf(value);

  // Reposition dropdown on scroll / resize while open
  useEffect(() => {
    if (!open) return;
    function reposition() {
      const r = inputRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    }
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  function openDropdown() {
    if (disabled) return;
    const r = inputRef.current?.getBoundingClientRect();
    if (r) setRect(r);
    setQuery('');
    setOpen(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    if (freeform) onChange(v);
    const r = inputRef.current?.getBoundingClientRect();
    if (r) setRect(r);
  }

  function handleBlur(e: React.FocusEvent) {
    // If focus moved into the dropdown list, don't close
    if (listRef.current?.contains(e.relatedTarget as Node)) return;

    if (freeform && query) {
      onChange(query);
    } else if (!freeform && query) {
      // Auto-select if typed text exactly matches an option label
      const match = options.find(
        (o) => o.label.toLowerCase() === query.toLowerCase()
      );
      if (match) onChange(match.value);
    }
    setOpen(false);
    setQuery('');
  }

  function handleSelect(opt: ComboOption) {
    setOpen(false);
    setQuery('');
    onChange(opt.value);
  }

  const dropdown =
    open && !disabled && filtered.length > 0 && rect
      ? createPortal(
          <ul
            ref={listRef}
            style={{
              position: 'fixed',
              top:   rect.bottom + 4,
              left:  rect.left,
              width: rect.width,
              zIndex: 9999,
            }}
            className="max-h-52 overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg text-sm py-1"
          >
            {filtered.map((opt) => (
              <li
                key={opt.value}
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep input focused so blur doesn't fire first
                  handleSelect(opt);
                }}
                className={`px-3 py-2 cursor-pointer hover:bg-neutral-50 ${
                  opt.value === value
                    ? 'font-medium text-neutral-900 bg-neutral-50'
                    : 'text-neutral-700'
                }`}
              >
                {opt.label}
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={openDropdown}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        required={required && !value}
        className={className}
      />
      {dropdown}
    </div>
  );
}
