'use client';

import { useState } from 'react';
import DropdownMenu, { MenuItem } from './DropdownMenu';

function rowMatchesQuery<T>(row: T, query: string, columns: Column<T>[]): boolean {
  const q = query.toLowerCase();
  return columns.some((col) => {
    // If the column has a render function that returns a plain string, use that —
    // it captures computed values like customer names looked up from a map.
    if (col.render) {
      const rendered = col.render(row);
      if (typeof rendered === 'string') {
        return rendered.toLowerCase().includes(q);
      }
    }
    // Fall back to the raw field value (covers status, boolean fields, etc.)
    const raw = getNestedValue(row, String(col.key));
    const text = String(raw ?? '').toLowerCase();
    return text.includes(q);
  });
}

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  /** Return an array of menu items for each row to render a three-dot actions column. */
  actions?: (row: T) => MenuItem[];
  /** Show the search / filter bar (default true). */
  searchable?: boolean;
  /** Button or element rendered top-left inside the table toolbar. */
  toolbar?: React.ReactNode;
}

type SortDir = 'asc' | 'desc';

function getNestedValue<T>(obj: T, key: string): unknown {
  return key.split('.').reduce((o, k) => (o as Record<string, unknown>)?.[k], obj as unknown);
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  actions,
  searchable = true,
  toolbar,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [query, setQuery] = useState('');

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const filtered = query
    ? data.filter((row) => rowMatchesQuery(row, query, columns))
    : data;

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = getNestedValue(a, sortKey) ?? '';
        const bv = getNestedValue(b, sortKey) ?? '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : filtered;

  return (
    <div>
      {(toolbar || searchable) && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b-[0.5px] border-neutral-200">
          {toolbar && <div className="shrink-0">{toolbar}</div>}
          {searchable && (
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full max-w-xs px-3 py-1.5 text-sm border border-neutral-300
                         rounded bg-white placeholder-neutral-400 outline-none appearance-none
                         focus:border-neutral-500"
            />
          )}
        </div>
      )}
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
            {/* Actions column header — blank, fixed width */}
            {actions && <th className="w-10 px-2 py-2.5" />}
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() => col.sortable && handleSort(String(col.key))}
                className={`px-4 py-2.5 text-left text-xs font-semibold text-neutral-500
                            uppercase tracking-wide whitespace-nowrap
                            ${col.sortable ? 'cursor-pointer select-none hover:text-neutral-700' : ''}
                            ${col.className ?? ''}`}
              >
                {col.header}
                {col.sortable && sortKey === String(col.key) && (
                  <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="px-4 py-8 text-center text-sm text-neutral-400"
              >
                No records found
              </td>
            </tr>
          )}
          {sorted.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b-[0.5px] border-neutral-100 hover:bg-neutral-50 transition-colors group
                          ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {actions && (
                <td className="px-2 py-3">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-start">
                    <DropdownMenu items={actions(row)} align="left" />
                  </div>
                </td>
              )}
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`px-4 py-3 text-neutral-700 ${col.className ?? ''}`}
                >
                  {col.render
                    ? col.render(row)
                    : String(getNestedValue(row, String(col.key)) ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}
