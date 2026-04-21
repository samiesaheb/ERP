'use client';

import { useState, useRef, useEffect } from 'react';

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

  const [query, setQuery]   = useState('');
  const [open,  setOpen]    = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) return;
    setQuery('');
  }, [open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const displayValue = open ? query : labelOf(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    if (freeform) onChange(v);
  }

  function handleFocus() {
    setQuery('');
    setOpen(true);
  }

  function handleSelect(opt: ComboOption) {
    setOpen(false);
    onChange(opt.value);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        required={required && !value}
        className={className}
      />
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg text-sm py-1">
          {filtered.map((opt) => (
            <li
              key={opt.value}
              onMouseDown={() => handleSelect(opt)}
              className={`px-3 py-2 cursor-pointer hover:bg-neutral-50 ${
                opt.value === value
                  ? 'font-medium text-neutral-900 bg-neutral-50'
                  : 'text-neutral-700'
              }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
