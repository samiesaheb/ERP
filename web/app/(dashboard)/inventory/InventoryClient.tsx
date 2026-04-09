'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { InventoryWithItem, InventoryTransaction, Item } from '@/lib/types';

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

export default function InventoryClient({
  inventory,
  transactions,
  items,
  itemMap,
  uomMap,
}: {
  inventory:    InventoryWithItem[];
  transactions: InventoryTransaction[];
  items:        Item[];
  itemMap:      Record<string, string>;
  uomMap:       Record<string, string>;
}) {
  const router = useRouter();
  const [tab, setTab]   = useState<'stock' | 'history'>('stock');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    item_id:          '',
    transaction_type: 'receipt',
    qty:              '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

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
        }),
      });
      setOpen(false);
      setForm({ item_id: '', transaction_type: 'receipt', qty: '' });
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
      {/* Tab bar + action button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
          {(['stock', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                tab === t
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t === 'stock' ? 'Stock Levels' : 'Transaction History'}
            </button>
          ))}
        </div>
        <Button onClick={() => setOpen(true)}>+ Stock Transaction</Button>
      </div>

      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        {tab === 'stock' ? (
          <DataTable
            columns={STOCK_COLUMNS}
            data={inventory}
            actions={(row) => [
              { label: 'Adjust Stock', onClick: () => { setForm((f) => ({ ...f, item_id: row.id })); setOpen(true); } },
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
              onChange={(e) => setForm({ ...form, item_id: e.target.value })}
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
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Quantity</label>
            <input required type="number" min="0.0001" step="any" value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
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
