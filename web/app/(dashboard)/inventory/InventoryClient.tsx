'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { InventoryWithItem, InventoryTransaction, Item, Uom } from '@/lib/types';

const TXN_TYPES = [
  { value: 'receipt',    label: 'Receipt — stock in' },
  { value: 'issue',      label: 'Issue — stock out' },
  { value: 'return',     label: 'Return' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'loss',       label: 'Loss / Write-off' },
];

const TXN_VARIANT: Record<string, 'green' | 'red' | 'blue' | 'amber' | 'gray'> = {
  receipt:    'green',
  return:     'green',
  issue:      'red',
  loss:       'red',
  adjustment: 'amber',
  conversion: 'blue',
};

const STOCK_COLUMNS: Column<InventoryWithItem>[] = [
  { key: 'item_code',    header: 'Code',      sortable: true },
  { key: 'description', header: 'Description', sortable: true },
  { key: 'location',    header: 'Location',   render: (r) => r.location   ?? '—' },
  { key: 'lot_number',  header: 'Lot',        render: (r) => r.lot_number ?? '—' },
  {
    key: 'qty_available',
    header: 'Available',
    sortable: true,
    className: 'tabular-nums font-medium',
    render: (r) => Number(r.qty_available).toLocaleString(),
  },
  {
    key: 'qty_reserved',
    header: 'Reserved',
    className: 'tabular-nums',
    render: (r) => Number(r.qty_reserved).toLocaleString(),
  },
  {
    key: 'low_stock',
    header: 'Alert',
    render: (r) =>
      r.low_stock
        ? <Badge variant="red">Low Stock</Badge>
        : <Badge variant="green">OK</Badge>,
  },
  {
    key: 'last_updated',
    header: 'Updated',
    sortable: true,
    render: (r) => new Date(r.last_updated).toLocaleDateString(),
  },
];

const EMPTY_FORM = {
  item_id:          '',
  transaction_type: 'receipt',
  qty:              '',
  uom_id:           '',
  lot_number:       '',
  location:         '',
  notes:            '',
};

export default function InventoryClient({
  inventory,
  transactions,
  items,
  itemMap,
  uomMap,
  uoms,
}: {
  inventory:    InventoryWithItem[];
  transactions: InventoryTransaction[];
  items:        Item[];
  itemMap:      Record<string, string>;
  uomMap:       Record<string, string>;
  uoms:         Uom[];
}) {
  const router = useRouter();
  const [tab, setTab]   = useState<'stock' | 'history'>('stock');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function openTransaction(itemId = '') {
    setForm({ ...EMPTY_FORM, item_id: itemId });
    setError('');
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/inventory/transact', {
        method: 'POST',
        body: JSON.stringify({
          item_id:          form.item_id,
          transaction_type: form.transaction_type,
          qty:              form.qty,
          uom_id:           form.uom_id           || null,
          lot_number:       form.lot_number        || null,
          location:         form.location          || null,
          notes:            form.notes             || null,
        }),
      });
      setOpen(false);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const txnColumns: Column<InventoryTransaction>[] = [
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      render: (r) => new Date(r.created_at).toLocaleString(),
    },
    {
      key: 'item_id',
      header: 'Item',
      render: (r) => itemMap[r.item_id] ?? r.item_id,
    },
    {
      key: 'transaction_type',
      header: 'Type',
      sortable: true,
      render: (r) => (
        <Badge variant={TXN_VARIANT[r.transaction_type] ?? 'gray'}>
          {r.transaction_type}
        </Badge>
      ),
    },
    {
      key: 'qty',
      header: 'Qty',
      className: 'tabular-nums font-medium',
      render: (r) => `${Number(r.qty).toLocaleString()} ${r.uom_id ? (uomMap[r.uom_id] ?? '') : ''}`,
    },
    { key: 'lot_number',     header: 'Lot',       render: (r) => r.lot_number ?? '—' },
    { key: 'reference_type', header: 'Ref Type',  render: (r) => r.reference_type ?? '—' },
    { key: 'notes',          header: 'Notes',     render: (r) => r.notes ?? '—' },
  ];

  return (
    <>
      {/* Action button + Tab bar */}
      <div className="flex flex-col items-start gap-2 mb-3">
        <Button onClick={() => openTransaction()}>+ Stock Transaction</Button>
        <div className="flex gap-0.5 bg-neutral-100 rounded-xl p-1">
          {(['stock', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-[10px] text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-white text-neutral-900 shadow-sm ring-[0.5px] ring-neutral-900/[0.06]'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t === 'stock' ? 'Stock Levels' : 'Transaction History'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        {tab === 'stock' ? (
          <DataTable
            columns={STOCK_COLUMNS}
            data={inventory}
            actions={(row) => [
              { label: 'Adjust Stock', onClick: () => openTransaction(row.id) },
              { label: 'Create PO',    onClick: () => router.push('/purchase-orders?new=1') },
            ]}
          />
        ) : (
          <DataTable
            columns={txnColumns}
            data={transactions}
          />
        )}
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="Stock Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
            <select required value={form.item_id}
              onChange={(e) => setForm({ ...form, item_id: e.target.value, uom_id: items.find((i) => i.id === e.target.value)?.uom_id ?? '' })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select item…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.item_code} — {i.description}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Transaction Type</label>
            <select value={form.transaction_type}
              onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              {TXN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Quantity</label>
              <input required type="number" min="0.0001" step="any" value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">UOM</label>
              <select value={form.uom_id}
                onChange={(e) => setForm({ ...form, uom_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
                <option value="">Select…</option>
                {uoms.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Lot Number</label>
              <input value={form.lot_number}
                onChange={(e) => setForm({ ...form, lot_number: e.target.value })}
                placeholder="e.g. LOT-2025-001"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Location</label>
              <input value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Warehouse A / Bin 3"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
            <textarea value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Optional notes"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded resize-none" />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving…' : 'Save Transaction'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
