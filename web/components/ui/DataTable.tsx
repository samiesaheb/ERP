'use client';

import { useState } from 'react';

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
}

type SortDir = 'asc' | 'desc';

function getNestedValue<T>(obj: T, key: string): unknown {
  return key.split('.').reduce((o, k) => (o as Record<string, unknown>)?.[k], obj as unknown);
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = getNestedValue(a, sortKey) ?? '';
        const bv = getNestedValue(b, sortKey) ?? '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
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
                colSpan={columns.length}
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
              className={`border-b-[0.5px] border-neutral-100 hover:bg-neutral-50 transition-colors
                          ${onRowClick ? 'cursor-pointer' : ''}`}
            >
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
  );
}
