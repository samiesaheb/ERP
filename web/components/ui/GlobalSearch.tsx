'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/client-api';

interface SearchResult {
  entity_type: string;
  id: string;
  label: string;
  sublabel: string | null;
}

const ENTITY_META: Record<string, { label: string; color: string }> = {
  sales_order:          { label: 'Sales Order',      color: 'bg-blue-100 text-blue-700' },
  purchase_order:       { label: 'Purchase Order',   color: 'bg-amber-100 text-amber-700' },
  manufacturing_order:  { label: 'Mfg Order',        color: 'bg-purple-100 text-purple-700' },
  production_batch:     { label: 'Batch',            color: 'bg-purple-100 text-purple-700' },
  invoice:              { label: 'Invoice',           color: 'bg-green-100 text-green-700' },
  shipment:             { label: 'Shipment',          color: 'bg-blue-100 text-blue-700' },
  receipt:              { label: 'Receipt',           color: 'bg-amber-100 text-amber-700' },
  item:                 { label: 'Item',              color: 'bg-neutral-100 text-neutral-600' },
  customer:             { label: 'Customer',          color: 'bg-green-100 text-green-700' },
  supplier:             { label: 'Supplier',          color: 'bg-red-100 text-red-700' },
};

function getUrl(type: string, id: string): string {
  switch (type) {
    case 'sales_order':         return `/sales-orders/${id}`;
    case 'purchase_order':      return `/purchase-orders/${id}`;
    case 'manufacturing_order': return `/manufacturing-orders/${id}`;
    case 'invoice':             return `/invoicing/${id}`;
    case 'shipment':            return `/shipments/${id}`;
    case 'production_batch':    return `/production`;
    case 'receipt':             return `/receiving`;
    case 'item':                return `/items`;
    case 'customer':            return `/customers`;
    case 'supplier':            return `/suppliers`;
    default:                    return '/';
  }
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<SearchResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const [active, setActive]     = useState(-1);
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await clientFetch<SearchResult[]>(
          `/api/v1/search?q=${encodeURIComponent(query.trim())}`,
        );
        setResults(data);
        setOpen(true);
        setActive(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard: ⌘K / Ctrl+K to focus, Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const navigate = useCallback((result: SearchResult) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    router.push(getUrl(result.entity_type, result.id));
  }, [router]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      navigate(results[active]);
    }
  }

  // Group results by entity_type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.entity_type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div ref={wrapperRef} className="relative w-64">
      {/* Input */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none"
          fill="none" stroke="currentColor" strokeWidth="2"
          viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search… (⌘K)"
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-neutral-100 border-[0.5px] border-neutral-200 rounded-lg placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:bg-white transition-colors"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border-[1.5px] border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border-[0.5px] border-neutral-200 rounded-xl shadow-lg z-50 max-h-[420px] overflow-y-auto">
          {Object.entries(grouped).map(([type, items]) => {
            const meta = ENTITY_META[type] ?? { label: type, color: 'bg-neutral-100 text-neutral-600' };
            return (
              <div key={type}>
                {/* Group header */}
                <div className="px-3 pt-2.5 pb-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
                {/* Rows */}
                {items.map((r, idx) => {
                  const globalIdx = results.indexOf(r);
                  return (
                    <button
                      key={r.id}
                      onMouseDown={(e) => { e.preventDefault(); navigate(r); }}
                      onMouseEnter={() => setActive(globalIdx)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                        globalIdx === active ? 'bg-neutral-50' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-sm text-neutral-800 font-medium truncate">{r.label}</span>
                      {r.sublabel && (
                        <span className="text-[11px] text-neutral-400 shrink-0">{r.sublabel}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
          <div className="border-t-[0.5px] border-neutral-100 px-3 py-2">
            <p className="text-[11px] text-neutral-400">↑↓ navigate · Enter to open · Esc to close</p>
          </div>
        </div>
      )}

      {/* No results */}
      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border-[0.5px] border-neutral-200 rounded-xl shadow-lg z-50 px-4 py-3">
          <p className="text-sm text-neutral-400">No results for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
