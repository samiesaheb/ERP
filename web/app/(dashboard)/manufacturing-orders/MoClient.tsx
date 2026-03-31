'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { moStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { ManufacturingOrder, SalesOrder, Item } from '@/lib/types';

const COLUMNS = (
  soMap: Record<string, string>,
  itemMap: Record<string, string>
): Column<ManufacturingOrder>[] => [
  { key: 'mo_number', header: 'MO #', sortable: true },
  { key: 'sales_order_id', header: 'Sales Order', render: (r) => soMap[r.sales_order_id] ?? '—' },
  { key: 'item_id', header: 'Finished Good', render: (r) => itemMap[r.item_id] ?? '—' },
  { key: 'target_qty', header: 'Target Qty',
    render: (r) => Number(r.target_qty).toLocaleString(), className: 'tabular-nums', sortable: true },
  { key: 'status', header: 'Status',
    render: (r) => <Badge variant={moStatusVariant(r.status)}>{r.status}</Badge>, sortable: true },
  { key: 'created_at', header: 'Created',
    render: (r) => new Date(r.created_at).toLocaleDateString(), sortable: true },
];

export default function MoClient({
  mos, soMap, itemMap, salesOrders, items,
}: {
  mos: ManufacturingOrder[];
  soMap: Record<string, string>;
  itemMap: Record<string, string>;
  salesOrders: SalesOrder[];
  items: Item[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sales_order_id: '', item_id: '', bom_id: '', target_qty: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/manufacturing-orders', { method: 'POST', body: JSON.stringify(form) });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const fgItems = items.filter((i) => i.item_type === 'fg');

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setOpen(true)}>+ New MO</Button>
      </div>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg overflow-hidden">
        <DataTable columns={COLUMNS(soMap, itemMap)} data={mos}
          onRowClick={(row) => router.push(`/manufacturing-orders/${row.id}`)} />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Manufacturing Order">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Sales Order</label>
            <select required value={form.sales_order_id}
              onChange={(e) => setForm({ ...form, sales_order_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select SO</option>
              {salesOrders.map((s) => <option key={s.id} value={s.id}>{s.order_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Finished Good</label>
            <select required value={form.item_id}
              onChange={(e) => setForm({ ...form, item_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select item</option>
              {fgItems.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.description}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">BOM ID</label>
            <input required placeholder="BOM UUID" value={form.bom_id}
              onChange={(e) => setForm({ ...form, bom_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Target Qty</label>
            <input required type="number" min="1" value={form.target_qty}
              onChange={(e) => setForm({ ...form, target_qty: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Creating…' : 'Create MO'}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
