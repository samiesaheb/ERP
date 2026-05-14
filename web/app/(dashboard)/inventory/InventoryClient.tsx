'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import DataTable, { Column } from '@/components/ui/DataTable';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import { useAppPrefs } from '@/contexts/AppPrefsContext';
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

const makeStockColumns = (t: (k: string) => string): Column<InventoryWithItem>[] => [
  { key: 'item_code',    header: t('Code'),      sortable: true },
  { key: 'description', header: t('Description'), sortable: true },
  { key: 'location',    header: t('Location'),   render: (r) => r.location   ?? '—' },
  { key: 'lot_number',  header: t('Lot'),        render: (r) => r.lot_number ?? '—' },
  {
    key: 'qty_available',
    header: t('On Hand'),
    sortable: true,
    className: 'tabular-nums font-medium',
    render: (r) => Number(r.qty_available).toLocaleString(),
  },
  {
    key: 'qty_reserved',
    header: t('Reserved'),
    className: 'tabular-nums',
    render: (r) => Number(r.qty_reserved).toLocaleString(),
  },
  {
    key: 'reorder_point',
    header: t('ATP'),
    className: 'tabular-nums',
    render: (r) => {
      const atp = Number(r.qty_available) - Number(r.qty_reserved);
      return (
        <span className={atp < 0 ? 'text-red-600 font-medium' : ''}>
          {atp.toLocaleString()}
        </span>
      );
    },
  },
  {
    key: 'reorder_alert',
    header: t('Alert'),
    render: (r) => {
      if (r.reorder_alert) return <Badge variant="red">Reorder</Badge>;
      if (r.reorder_point) return <Badge variant="green">OK</Badge>;
      return <Badge variant="gray">—</Badge>;
    },
  },
  {
    key: 'last_counted_at',
    header: t('Last Count'),
    render: (r) =>
      r.last_counted_at
        ? <span className="text-xs text-neutral-500">{new Date(r.last_counted_at).toLocaleDateString()}</span>
        : <span className="text-xs text-neutral-400">Never</span>,
  },
  {
    key: 'last_updated',
    header: t('Updated'),
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

const EMPTY_COUNT = { counted_qty: '', notes: '' };

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
  const { t } = useAppPrefs();
  const [tab, setTab]   = useState<'stock' | 'history'>('stock');

  // Transaction slide-over
  const [txnOpen,    setTxnOpen]    = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnError,   setTxnError]   = useState('');

  // Cycle count slide-over
  const [countOpen,    setCountOpen]    = useState(false);
  const [countItem,    setCountItem]    = useState<InventoryWithItem | null>(null);
  const [countForm,    setCountForm]    = useState(EMPTY_COUNT);
  const [countLoading, setCountLoading] = useState(false);
  const [countError,   setCountError]   = useState('');

  function openTransaction(itemId = '') {
    setForm({ ...EMPTY_FORM, item_id: itemId });
    setTxnError('');
    setTxnOpen(true);
  }

  function openCycleCount(row: InventoryWithItem) {
    setCountItem(row);
    setCountForm({ counted_qty: Number(row.qty_available).toString(), notes: '' });
    setCountError('');
    setCountOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTxnError('');
    setTxnLoading(true);
    try {
      await clientFetch('/api/v1/inventory/transact', {
        method: 'POST',
        body: JSON.stringify({
          item_id:          form.item_id,
          transaction_type: form.transaction_type,
          qty:              form.qty,
          uom_id:           form.uom_id    || null,
          lot_number:       form.lot_number || null,
          location:         form.location   || null,
          notes:            form.notes      || null,
        }),
      });
      setTxnOpen(false);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (err) {
      setTxnError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setTxnLoading(false);
    }
  }

  async function handleCycleCount(e: React.FormEvent) {
    e.preventDefault();
    if (!countItem) return;
    setCountError('');
    setCountLoading(true);
    try {
      await clientFetch(`/api/v1/inventory/${countItem.item_id}/cycle-count`, {
        method: 'POST',
        body: JSON.stringify({
          counted_qty: countForm.counted_qty,
          notes:       countForm.notes || null,
        }),
      });
      setCountOpen(false);
      setCountItem(null);
      router.refresh();
    } catch (err) {
      setCountError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setCountLoading(false);
    }
  }

  const txnColumns: Column<InventoryTransaction>[] = [
    {
      key: 'created_at',
      header: t('Date'),
      sortable: true,
      render: (r) => new Date(r.created_at).toLocaleString(),
    },
    {
      key: 'item_id',
      header: t('Item'),
      render: (r) => itemMap[r.item_id] ?? r.item_id,
    },
    {
      key: 'transaction_type',
      header: t('Type'),
      sortable: true,
      render: (r) => (
        <Badge variant={TXN_VARIANT[r.transaction_type] ?? 'gray'}>
          {r.transaction_type}
        </Badge>
      ),
    },
    {
      key: 'qty',
      header: t('Qty'),
      className: 'tabular-nums font-medium',
      render: (r) => `${Number(r.qty).toLocaleString()} ${r.uom_id ? (uomMap[r.uom_id] ?? '') : ''}`,
    },
    { key: 'lot_number',     header: t('Lot'),      render: (r) => r.lot_number    ?? '—' },
    { key: 'reference_type', header: t('Ref Type'), render: (r) => r.reference_type ?? '—' },
    { key: 'notes',          header: t('Notes'),    render: (r) => r.notes          ?? '—' },
  ];

  return (
    <>
      {/* Tab bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-0.5 bg-neutral-100 rounded-xl p-1">
          {(['stock', 'history'] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-4 py-1.5 rounded-[10px] text-sm font-medium transition-all ${
                tab === tabKey
                  ? 'bg-white text-neutral-900 shadow-sm ring-[0.5px] ring-neutral-900/[0.06]'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tabKey === 'stock' ? t('Stock Levels') : t('Transaction History')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        {tab === 'stock' ? (
          <DataTable
            columns={makeStockColumns(t)}
            toolbar={<Button onClick={() => openTransaction()}>+ Stock Transaction</Button>}
            data={inventory}
            actions={(row) => [
              { label: 'Adjust Stock',  onClick: () => openTransaction(row.item_id) },
              { label: 'Cycle Count',   onClick: () => openCycleCount(row) },
              { label: 'Create PO',     onClick: () => router.push('/purchase-orders?new=1') },
            ]}
          />
        ) : (
          <DataTable
            columns={txnColumns}
            toolbar={<Button onClick={() => openTransaction()}>+ Stock Transaction</Button>}
            data={transactions}
          />
        )}
      </div>

      {/* Stock Transaction Slide-over */}
      <SlideOver open={txnOpen} onClose={() => setTxnOpen(false)} title="Stock Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
            <ComboBox
              required
              value={form.item_id}
              onChange={(v) => setForm({ ...form, item_id: v, uom_id: items.find((i) => i.id === v)?.uom_id ?? '' })}
              options={items.map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))}
              placeholder="Select item…"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Transaction Type</label>
            <ComboBox
              freeform
              value={form.transaction_type}
              onChange={(v) => setForm({ ...form, transaction_type: v })}
              options={TXN_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
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
              <ComboBox
                value={form.uom_id}
                onChange={(v) => setForm({ ...form, uom_id: v })}
                options={uoms.map((u) => ({ value: u.id, label: u.code }))}
                placeholder="Select…"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
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
                placeholder="e.g. RM-STORE / Bin 3"
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

          {txnError && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{txnError}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={txnLoading} className="flex-1">
              {txnLoading ? 'Saving…' : 'Save Transaction'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setTxnOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>

      {/* Cycle Count Slide-over */}
      <SlideOver open={countOpen} onClose={() => setCountOpen(false)} title="Cycle Count">
        {countItem && (
          <form onSubmit={handleCycleCount} className="space-y-4">
            <div className="bg-neutral-50 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-neutral-800">{countItem.item_code}</p>
              <p className="text-neutral-500 text-xs mt-0.5">{countItem.description}</p>
              <p className="text-neutral-500 text-xs mt-2">
                System quantity: <span className="font-medium text-neutral-700">{Number(countItem.qty_available).toLocaleString()}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Counted Quantity *</label>
              <input
                required
                type="number"
                min="0"
                step="any"
                value={countForm.counted_qty}
                onChange={(e) => setCountForm({ ...countForm, counted_qty: e.target.value })}
                placeholder="Enter physical count"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
              {countForm.counted_qty !== '' && (
                <p className="text-[11px] text-neutral-400 mt-1">
                  Adjustment: {(Number(countForm.counted_qty) - Number(countItem.qty_available) >= 0 ? '+' : '')}
                  {(Number(countForm.counted_qty) - Number(countItem.qty_available)).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
              <textarea
                value={countForm.notes}
                onChange={(e) => setCountForm({ ...countForm, notes: e.target.value })}
                rows={2}
                placeholder="Reason for discrepancy (optional)"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded resize-none"
              />
            </div>

            {countError && (
              <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{countError}</p>
            )}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={countLoading} className="flex-1">
                {countLoading ? 'Saving…' : 'Record Count'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCountOpen(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </SlideOver>
    </>
  );
}
