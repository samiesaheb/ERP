'use client';

import { useState, useMemo } from 'react';
import Badge from '@/components/ui/Badge';
import type { AuditLog } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_VARIANT: Record<string, 'green' | 'blue' | 'red'> = {
  INSERT: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
};

const TABLE_LABELS: Record<string, string> = {
  sales_orders:           'Sales Orders',
  sales_order_lines:      'SO Lines',
  purchase_orders:        'Purchase Orders',
  purchase_order_lines:   'PO Lines',
  manufacturing_orders:   'Mfg Orders',
  production_batches:     'Batches',
  batch_component_issues: 'Batch Issues',
  production_plans:       'Production Plans',
  inventory:              'Inventory',
  inventory_transactions: 'Inventory Txns',
  receipts:               'Receipts',
  receipt_lines:          'Receipt Lines',
  shipments:              'Shipments',
  shipment_lines:         'Shipment Lines',
  shipping_documents:     'Shipping Docs',
  invoices:               'Invoices',
  invoice_lines:          'Invoice Lines',
  payments:               'Payments',
  artworks:               'Artworks',
  fda_registrations:      'FDA Registrations',
  fda_documents:          'FDA Documents',
  boms:                   'BOMs',
  bom_lines:              'BOM Lines',
  items:                  'Items',
  customers:              'Customers',
  suppliers:              'Suppliers',
  users:                  'Users',
};

/** Compute a plain-text summary of what changed in an UPDATE. */
function diffSummary(
  old_data: Record<string, unknown> | null,
  new_data: Record<string, unknown> | null,
): { key: string; from: string; to: string }[] {
  if (!old_data || !new_data) return [];
  const skip = new Set(['created_at', 'updated_at', 'password_hash']);
  return Object.keys(new_data)
    .filter((k) => !skip.has(k) && JSON.stringify(old_data[k]) !== JSON.stringify(new_data[k]))
    .map((k) => ({
      key:  k,
      from: old_data[k] == null ? '—' : String(old_data[k]),
      to:   new_data[k] == null ? '—' : String(new_data[k]),
    }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ALL_TABLES = Array.from(
  new Set(Object.keys(TABLE_LABELS))
).sort();

export default function AuditLogsClient({ logs }: { logs: AuditLog[] }) {
  const [tableFilter,  setTableFilter]  = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search,       setSearch]       = useState('');
  const [expanded,     setExpanded]     = useState<string | null>(null);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (tableFilter  && log.table_name !== tableFilter)  return false;
      if (actionFilter && log.action     !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [
          log.table_name,
          log.record_id ?? '',
          log.changed_by_name ?? '',
          log.action,
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, tableFilter, actionFilter, search]);

  // collect table names that actually appear in the data
  const presentTables = useMemo(
    () => Array.from(new Set(logs.map((l) => l.table_name))).sort(),
    [logs]
  );

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Audit Trail</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {filtered.length} of {logs.length} events
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-neutral-400"
        />

        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400"
        >
          <option value="">All tables</option>
          {presentTables.map((t) => (
            <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400"
        >
          <option value="">All actions</option>
          <option value="INSERT">Insert</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>

        {(tableFilter || actionFilter || search) && (
          <button
            onClick={() => { setTableFilter(''); setActionFilter(''); setSearch(''); }}
            className="text-sm text-neutral-400 hover:text-neutral-700 px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide w-44">Timestamp</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide w-20">Action</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Table</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Record</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-400">
                  No audit events found.
                </td>
              </tr>
            )}
            {filtered.map((log) => {
              const diff = log.action === 'UPDATE' ? diffSummary(log.old_data, log.new_data) : [];
              const isExpanded = expanded === log.id;

              return (
                <>
                  <tr
                    key={log.id}
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                    className="hover:bg-neutral-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 text-neutral-500 font-mono text-xs whitespace-nowrap">
                      {new Date(log.changed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={ACTION_VARIANT[log.action] ?? 'gray'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {TABLE_LABELS[log.table_name] ?? log.table_name}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-400 font-mono text-xs">
                      {log.record_id ? log.record_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {log.changed_by_name ?? <span className="text-neutral-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500 text-xs">
                      {log.action === 'UPDATE' && diff.length > 0 && (
                        <span>{diff.length} field{diff.length !== 1 ? 's' : ''} changed</span>
                      )}
                      {log.action === 'INSERT' && (
                        <span className="text-green-600">Created</span>
                      )}
                      {log.action === 'DELETE' && (
                        <span className="text-red-500">Deleted</span>
                      )}
                      {log.action === 'UPDATE' && diff.length === 0 && (
                        <span className="text-neutral-300">No visible changes</span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr key={`${log.id}-detail`} className="bg-neutral-50">
                      <td colSpan={6} className="px-6 py-3">
                        {log.action === 'UPDATE' && diff.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wide">Changed Fields</p>
                            {diff.map((d) => (
                              <div key={d.key} className="flex items-center gap-2 text-xs">
                                <span className="w-36 font-medium text-neutral-700 truncate">{d.key}</span>
                                <span className="text-red-500 line-through max-w-xs truncate">{d.from}</span>
                                <span className="text-neutral-400">→</span>
                                <span className="text-green-600 max-w-xs truncate">{d.to}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {log.action === 'INSERT' && log.new_data && (
                          <div>
                            <p className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wide">Created Record</p>
                            <pre className="text-xs text-neutral-600 overflow-x-auto whitespace-pre-wrap max-h-48">
                              {JSON.stringify(log.new_data, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.action === 'DELETE' && log.old_data && (
                          <div>
                            <p className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wide">Deleted Record</p>
                            <pre className="text-xs text-neutral-600 overflow-x-auto whitespace-pre-wrap max-h-48">
                              {JSON.stringify(log.old_data, null, 2)}
                            </pre>
                          </div>
                        )}

                        <p className="text-[10px] text-neutral-400 mt-2 font-mono">
                          ID: {log.record_id ?? 'N/A'} · Log: {log.id}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
